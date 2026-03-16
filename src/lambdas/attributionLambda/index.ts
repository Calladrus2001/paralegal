import type { SQSEvent, SQSHandler } from "aws-lambda";
import paralegalVectorDbClient from "../../clients/weaviate";
import { ChatService } from "../../services/chat";
import { FeedbackService } from "../../services/feedback";

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log(`Received ${event.Records.length} SQS records for attribution.`);

  const record = event.Records[0];
  if (!record) return;

  try {
    const payload = JSON.parse(record.body);
    const { feedbackId, responseId, chatId, feedbackType, bucket, createdAt } = payload;

    console.log(`Processing feedback ${feedbackId} for response ${responseId} in bucket ${bucket}`);

    // 1. Skip Human bucket as requested in strategy 5.1 step 3 (and user clarification)
    if (bucket === "Human") {
      console.log(`Bucket is Human, skipping LLM attribution for ${feedbackId}`);
      return;
    }

    // 2. Fetch the MessageRecord to get retrievedChunkIds and the actual response text
    const messageRecord = await ChatService.getMessageByResponseId(responseId);
    
    if (!messageRecord) {
      throw new Error(`MessageRecord not found for responseId=${responseId}`);
    }

    const { response: responseText, retrievedChunkIds = [] } = messageRecord;

    if (retrievedChunkIds.length === 0) {
      console.log(`No retrievedChunkIds found for response ${responseId}. Marking feedback ${feedbackId} as unattributable.`);
      return;
    }

    // 3. Run Cosine Similarity Attribution against Weaviate candidate chunks
    console.log(`Running similarity for ${retrievedChunkIds.length} candidate chunks...`);
    const attributedChunks = await paralegalVectorDbClient.findAttributedChunks(responseText, retrievedChunkIds);
    
    console.log(`Found ${attributedChunks.length} chunks meeting the attribution threshold.`);

    if (attributedChunks.length > 0) {
      const chunkIds = attributedChunks.map((c) => c.id);
      const maxConfidence = Math.max(...attributedChunks.map((c) => c.confidence));

      await FeedbackService.updateAttributionResults(
        responseId,
        createdAt,
        chunkIds,
        maxConfidence
      );
    }
  } catch (error) {
    console.error(`Error processing record ${record.messageId}:`, error);
    // Throwing the error ensures SQS will fail the message and retry or route it to DLQ
    throw error;
  }
};
