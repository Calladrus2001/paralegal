import type { SQSEvent, SQSHandler } from "aws-lambda";
import paralegalVectorDbClient from "../../clients/weaviate";
import { ChatService } from "../../services/chat";
import { FeedbackService } from "../../services/feedback";

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log(`[AttributionLambda] Received SQS event with ${event.Records.length} records.`);

  const record = event.Records[0];
  if (!record) return;

  try {
    const payload = JSON.parse(record.body);
    const { feedbackId, responseId, bucket, createdAt, incorrectClaim } = payload;

    console.log(`[AttributionLambda] Processing feedback ${feedbackId} for response ${responseId} in bucket ${bucket}`);

    if (bucket === "Human") {
      console.log(`[AttributionLambda] Bucket is Human, skipping LLM attribution for ${feedbackId}`);
      return;
    }

    // 1. Fetch the MessageRecord to get retrievedChunkIds
    const messageRecord = await ChatService.getMessageByResponseId(responseId);
    
    if (!messageRecord) {
      throw new Error(`[AttributionLambda] MessageRecord not found for responseId=${responseId}`);
    }

    const { retrievedChunkIds = [] } = messageRecord;

    if (retrievedChunkIds.length === 0) {
      console.log(`[AttributionLambda] No retrievedChunkIds found for response ${responseId}. Marking as unattributable.`);
      await FeedbackService.updateAttributionResults(responseId, createdAt, [], 0);
      return;
    }

    // 2. Fetch the full text content for each of the candidate chunks
    console.log(`[AttributionLambda] Fetching text for ${retrievedChunkIds.length} candidate chunks...`);
    const chunks = await paralegalVectorDbClient.getChunksByIds(retrievedChunkIds);
    
    // 3. Use the FeedbackService (LLM) to pinpoint the culprit chunk
    console.log(`[AttributionLambda] Performing LLM-based attribution for claim: "${incorrectClaim}"`);
    const attributionResult = await FeedbackService.pickCulpritChunk(
      incorrectClaim,
      chunks.map(c => ({ id: c.id!, text: c.text }))
    );

    // 4. Update the feedback record
    if (attributionResult.culpritChunkId) {
      console.log(`[AttributionLambda] Attributed feedback ${feedbackId} to chunk ${attributionResult.culpritChunkId} with confidence ${attributionResult.confidence}`);
      
      await FeedbackService.updateAttributionResults(
        responseId,
        createdAt,
        [attributionResult.culpritChunkId],
        attributionResult.confidence
      );
    } else {
      console.log(`[AttributionLambda] No culprit chunk identified for feedback ${feedbackId}. Reason: ${attributionResult.reasoning}`);
      await FeedbackService.updateAttributionResults(responseId, createdAt, [], 0);
    }
  } catch (error) {
    console.error(`[AttributionLambda] Error processing record ${record.messageId}:`, error);
    throw error;
  }
};
