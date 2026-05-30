import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, FEEDBACKS_TABLE, CHUNK_ATTRIBUTIONS_TABLE } from "../clients/aws";
import { batchWriteItems } from "../common/dynamodb";
import { nanoid } from "nanoid";
import { miniModel } from "../clients/openai";
import type { FeedbackRequest, FeedbackRecord, AttributionResult } from "../types/feedback";
import { AttributionResultSchema } from "../types/feedback";
import { buildAttributionPrompt } from "../prompts/feedback";

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

    const mappingRequests = chunkIds.map((chunkId) => ({
      PutRequest: {
        Item: {
          chunkId,
          createdAt_responseId: `${createdAt}#${responseId}`,
          createdAt,
          responseId,
          attributionConfidence: confidence,
        },
      },
    }));

    await Promise.all([
      dynamo.send(command),
      batchWriteItems(CHUNK_ATTRIBUTIONS_TABLE, mappingRequests),
    ]);
  }

  /**
   * Uses an LLM to identify which chunk from a list of candidates is responsible for a specific incorrect claim.
   */
  static async pickCulpritChunk(
    incorrectClaim: string,
    candidateChunks: { id: string; text: string }[]
  ): Promise<AttributionResult> {
    if (candidateChunks.length === 0) {
      return {
        culpritChunkId: null,
        evidenceQuote: "",
        reasoning: "No candidate chunks provided.",
        confidence: 0,
      };
    }

    const structuredModel = miniModel.withStructuredOutput(AttributionResultSchema);

    const chunksText = candidateChunks
      .map((c) => `[ID: ${c.id}] Chunk Content:\n${c.text}\n---`)
      .join("\n\n");

    const prompt = buildAttributionPrompt(incorrectClaim, chunksText);

    try {
      const result = await structuredModel.invoke(prompt) as AttributionResult;
      console.log(`[FeedbackService] Culprit identified: ${result.culpritChunkId} | Confidence: ${result.confidence}`);
      return result;
    } catch (error) {
      console.error("[FeedbackService] LLM attribution failed:", error);
      return {
        culpritChunkId: null,
        evidenceQuote: "",
        reasoning: "LLM attribution failed due to internal error.",
        confidence: 0,
      };
    }
  }
}
