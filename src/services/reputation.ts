import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { redis } from "../clients/redis";
import { dynamo, STATS_TABLE } from "../clients/aws";
import paralegalVectorDbClient from "../clients/weaviate";
import type { ChunkStats } from "../types/reputation";

export class ReputationService {
  private static RETRIEVAL_KEY_PREFIX = "chunk_retrievals:";
  private static PENALTY_KEY_PREFIX = "chunk_penalties:";
  private static MIN_RETRIEVALS = 10;
  private static DECAY_LAMBDA = 0.023; // exp(-0.023 * days)

  /**
   * INCR the retrieval count in Redis (Denominator)
   * Called during every query retrieval (Phase 1, Step 3)
   */
  static async incrementRetrievalCount(chunkId: string): Promise<void> {
    const key = `${this.RETRIEVAL_KEY_PREFIX}${chunkId}`;
    await redis.incr(key);
  }

  /**
   * INCR the penalty score in Redis (Numerator)zz
   * Called by Scoring Lambda (Phase 4, Step 8)z
   */
  static async incrementPenalty(chunkId: string, penalty: number): Promise<void> {
    const key = `${this.PENALTY_KEY_PREFIX}${chunkId}`;
    await redis.incrbyfloat(key, penalty);
  }

  /**
   * Get all dirty chunk IDs that have pending increments in Redis
   */
  static async getDirtyChunkIds(): Promise<string[]> {
    const retrievalKeys = await redis.keys(`${this.RETRIEVAL_KEY_PREFIX}*`);
    const penaltyKeys = await redis.keys(`${this.PENALTY_KEY_PREFIX}*`);
    const allKeys = [...retrievalKeys, ...penaltyKeys];
    
    // Extract unique chunkIds from keys
    const chunkIds = new Set<string>();
    for (const key of allKeys) {
      const id = key.split(":")[1];
      if (id) chunkIds.add(id);
    }
    return Array.from(chunkIds);
  }

  /**
   * Aggregation Layer: Flush Redis counts into DynamoDB and Sync Weaviate
   * Called by Flush Lambda (Phase 4, Step 9)
   */
  static async flushChunkReputation(chunkId: string): Promise<void> {
    const retrievalKey = `${this.RETRIEVAL_KEY_PREFIX}${chunkId}`;
    const penaltyKey = `${this.PENALTY_KEY_PREFIX}${chunkId}`;

    // 1. Atomic fetch and reset counts from Redis
    const [retrievalsStr, penaltiesStr] = await redis.mget(retrievalKey, penaltyKey);
    const newRetrievals = parseInt(retrievalsStr || "0", 10);
    const newPenalties = parseFloat(penaltiesStr || "0");

    if (newRetrievals === 0 && newPenalties === 0) return;

    // 2. Fetch current STATS from DynamoDB
    const statsResult = await dynamo.send(new GetCommand({
      TableName: STATS_TABLE,
      Key: { chunkId }
    }));

    const now = new Date();
    const existingStats: ChunkStats = statsResult.Item as ChunkStats || {
      chunkId,
      cumulativePenalty: 0,
      totalRetrievals: 0,
      weightedScore: 0,
      tier: "HEALTHY",
      lastEvaluatedAt: now.toISOString()
    };

    // 3. Apply Decay to historical penalty
    const lastEval = new Date(existingStats.lastEvaluatedAt);
    const daysSinceLast = (now.getTime() - lastEval.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-this.DECAY_LAMBDA * daysSinceLast);

    const decayedHistoricalPenalty = existingStats.cumulativePenalty * decayFactor;
    const updatedPenalty = decayedHistoricalPenalty + newPenalties;
    const updatedRetrievals = existingStats.totalRetrievals + newRetrievals;

    // 4. Calculate New Score
    // Gate: use max(retrievals, 10) to avoid volatility in new chunks
    const divisor = Math.max(updatedRetrievals, this.MIN_RETRIEVALS);
    const newScore = updatedPenalty / divisor;

    // 5. Determine Tier
    let tier: ChunkStats["tier"] = "HEALTHY";
    if (newScore > 0.50) tier = "FLAG";
    else if (newScore > 0.20) tier = "DEGRADE";
    else if (newScore > 0.05) tier = "WATCH";

    const updatedStats: ChunkStats = {
      ...existingStats,
      cumulativePenalty: updatedPenalty,
      totalRetrievals: updatedRetrievals,
      weightedScore: newScore,
      tier,
      lastEvaluatedAt: now.toISOString()
    };

    // 6. DB "Double Write" - DynamoDB & Weaviate
    await dynamo.send(new PutCommand({
      TableName: STATS_TABLE,
      Item: updatedStats
    }));

    await paralegalVectorDbClient.updateChunkReputation(chunkId, newScore, tier);

    // 7. Success! Now safe to clear Redis counters
    await redis.del(retrievalKey, penaltyKey);
  }
}
