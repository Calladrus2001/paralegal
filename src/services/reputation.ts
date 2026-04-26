import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { redis } from "../clients/redis";
import { dynamo, STATS_TABLE } from "../clients/aws";
import paralegalVectorDbClient from "../clients/weaviate";
import { CorrectionService } from "./correction";
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
   * INCR the penalty score in Redis (Numerator)
   * Called by Scoring Lambda (Phase 4, Step 8)
   */
  static async incrementPenalty(chunkId: string, penalty: number): Promise<void> {
    const key = `${this.PENALTY_KEY_PREFIX}${chunkId}`;
    await redis.incrbyfloat(key, penalty);
  }

  /**
   * Get all dirty chunk IDs that have pending increments in Redis
   */
  static async getDirtyChunkIds(): Promise<string[]> {
    const chunkIds = new Set<string>();

    const stream = redis.scanStream({
      match: "chunk_*:*",
      count: 100,
    });

    for await (const keys of stream) {
      for (const key of keys) {
        const id = key.split(":")[1];
        if (id) chunkIds.add(id);
      }
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

    // 1. Atomic fetch-and-delete from Redis (prevents race with concurrent INCR/INCRBYFLOAT)
    const [retrievalsStr, penaltiesStr] = await Promise.all([
      redis.getdel(retrievalKey),
      redis.getdel(penaltyKey),
    ]);
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

    // Trigger Correction Sync if the block is under scrutiny
    if (tier === "DEGRADE" || tier === "FLAG") {
      await CorrectionService.syncChunkCorrections(chunkId);
    }

    // Redis counters already cleared atomically via GETDEL in step 1
  }
}
