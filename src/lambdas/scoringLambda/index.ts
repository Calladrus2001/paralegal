import type { SQSEvent, SQSHandler } from "aws-lambda";
import { ReputationService } from "../../services/reputation";

/**
 * Scoring Lambda (Increment Layer)
 * Triggered by Scoring SQS Queue (Step 8/9)
 * Goal: Increment penalty counters in Redis for attributed chunks.
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log(`Received SQS event with ${event.Records.length} records. Processing first only.`);

  const record = event.Records[0];
  if (!record) return;

  const SEVERITY_WEIGHTS: Record<string, number> = {
    "Fabricated information": 1.0,
    "Factually incorrect": 0.9,
    "Irrelevant": 0.6,
    "Insufficient detail": 0.4,
    "Partial answer only": 0.3,
    "Generic / boilerplate": 0.2,
    "Misinterpreted intent": 0.2,
  };

  try {
    const payload = JSON.parse(record.body);
    const { feedbackType, attributedChunkIds = [], attributionConfidence = 1.0 } = payload;

    const severity = SEVERITY_WEIGHTS[feedbackType] || 0.1;
    const penalty = severity * attributionConfidence;

    console.log(`Applying penalty ${penalty.toFixed(4)} to ${attributedChunkIds.length} chunks for feedback: ${feedbackType}`);

    // Batch the Redis increments
    await Promise.all(
      attributedChunkIds.map((chunkId: string) => 
        ReputationService.incrementPenalty(chunkId, penalty)
      )
    );
  } catch (error) {
    console.error(`Error processing scoring record ${record.messageId}:`, error);
    throw error;
  }
};
