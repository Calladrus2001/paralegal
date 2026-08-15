import { SendMessageCommand } from "@aws-sdk/client-sqs";
import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { sqsClient, ATTRIBUTION_QUEUE_URL, SCORING_QUEUE_URL } from "../../clients/aws";

export const handler: DynamoDBStreamHandler = async (event: DynamoDBStreamEvent) => {
  console.log(`[SwitchLambda] Processing DynamoDB Stream event with ${event.Records.length} records. Processing first only.`);

  const record = event.Records[0];
  if (!record) return;

  try {
    if (record.eventName !== "INSERT" && record.eventName !== "MODIFY") return;

    const newImage = record.dynamodb?.NewImage;
    if (!newImage) return;

    const parsedRecord = unmarshall(newImage as any);
    
    const {
      feedbackId,
      responseId,
      chatId,
      feedbackType,
      bucket,
      createdAt,
      status,
      incorrectClaim,
      correctValue,
      attributedChunkIds = [],
      attributionConfidence
    } = parsedRecord;

    if (!feedbackId || !responseId || !status) return;

    console.log(`[SwitchLambda] Record ${feedbackId} (response: ${responseId}): status=${status}, eventName=${record.eventName}`);

    // Unmarshall OldImage once if present (used by both routes)
    const oldImage = record.eventName === "MODIFY" && record.dynamodb?.OldImage
      ? unmarshall(record.dynamodb.OldImage as any)
      : null;

    // ==========================================
    // ROUTING LOGIC
    // ==========================================
    
    // Route 1: Needs Attribution (New pending request, exclude human bucket)
    if (status === "PENDING" && bucket !== "Human") {
      // If it's a MODIFY, ensure it wasn't already PENDING to avoid infinite loops
      if (oldImage?.status === "PENDING") {
        console.log(`[SwitchLambda] Skipping attribution for ${feedbackId}: already PENDING in OldImage.`);
        return;
      }

      console.log(`[SwitchLambda] Routing ${feedbackId} to Attribution Queue`);
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: ATTRIBUTION_QUEUE_URL,
          MessageBody: JSON.stringify({
            feedbackId,
            responseId,
            chatId,
            feedbackType,
            bucket,
            incorrectClaim,
            correctValue,
            createdAt,
          }),
        })
      );
    }
    
    // Route 2: Needs Scoring (Finished attribution)
    else if (status === "PROCESSED") {
      // We only want to trigger scoring when it *transitions* to PROCESSED
      if (oldImage?.status === "PROCESSED") {
        console.log(`[SwitchLambda] Skipping scoring for ${feedbackId}: already PROCESSED in OldImage.`);
        return;
      }

      if (attributedChunkIds.length === 0) {
        console.log(`[SwitchLambda] Feedback ${feedbackId} processed but no chunks attributed. Skipping scoring.`);
        return;
      }

      console.log(`[SwitchLambda] Routing ${feedbackId} to Scoring Queue with ${attributedChunkIds.length} chunks`);
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: SCORING_QUEUE_URL,
          MessageBody: JSON.stringify({
            feedbackId,
            responseId,
            feedbackType,
            attributedChunkIds,
            attributionConfidence,
          }),
        })
      );
    }

  } catch (error) {
    console.error("[SwitchLambda] Error processing stream record:", error, "Record:", JSON.stringify(record));
    throw error;
  }
};
