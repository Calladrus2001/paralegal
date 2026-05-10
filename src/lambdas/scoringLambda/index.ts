import type { SQSEvent, SQSHandler } from "aws-lambda";
import { ReputationService } from "../../services/reputation";
import { SEVERITY_WEIGHTS } from "../../types/feedback";

/**
 * Scoring Lambda (Increment Layer)
 * Triggered by Scoring SQS Queue (Step 8/9)
 * Goal: Increment penalty counters in Redis for attributed chunks.
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log(`[ScoringLambda] Received SQS event with ${event.Records.length} records.`);

  const record = event.Records[0];
  if (!record) return;

  try {
    const payload = JSON.parse(record.body);
    const { feedbackType, attributedChunkIds = [], attributionConfidence = 1.0 } = payload;

    const severity = SEVERITY_WEIGHTS[feedbackType as keyof typeof SEVERITY_WEIGHTS] ?? 0.1;
    const penalty = severity * attributionConfidence;

    console.log(`[ScoringLambda] Applying penalty ${penalty.toFixed(4)} to ${attributedChunkIds.length} chunks for feedback: ${feedbackType}`);

    // Batch the Redis increments
    await Promise.all(
      attributedChunkIds.map((chunkId: string) => 
        ReputationService.incrementPenalty(chunkId, penalty)
      )
    );
  } catch (error) {
    console.error(`[ScoringLambda] Error processing scoring record ${record.messageId}:`, error);
    throw error;
  }
};
