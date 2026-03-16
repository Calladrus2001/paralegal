import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, FEEDBACKS_TABLE } from "../clients/aws";
import { nanoid } from "nanoid";
import type { FeedbackRequest, FeedbackRecord } from "../types/feedback";

export class FeedbackService {
  /**
   * Submit a new user feedback record to the Feedbacks table.
   * PK: responseId
   * SK: createdAt
   */
  static async submitFeedback(request: FeedbackRequest): Promise<FeedbackRecord> {
    const feedbackId = nanoid();
    const now = new Date().toISOString();

    const record: FeedbackRecord = {
      ...request,
      feedbackId,
      status: "PENDING",
      createdAt: now,
    };

    const command = new PutCommand({
      TableName: FEEDBACKS_TABLE,
      Item: record,
    });

    await dynamo.send(command);
    return record;
  }

  /**
   * Update a feedback record with attribution results.
   */
  static async updateAttributionResults(
    responseId: string,
    createdAt: string,
    chunkIds: string[],
    confidence: number
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: FEEDBACKS_TABLE,
      Key: {
        responseId,
        createdAt,
      },
      UpdateExpression: "SET attributedChunkIds = :chunkIds, attributionConfidence = :confidence, #status = :processed",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":chunkIds": chunkIds,
        ":confidence": confidence,
        ":processed": "PROCESSED",
      },
    });

    await dynamo.send(command);
  }
}
