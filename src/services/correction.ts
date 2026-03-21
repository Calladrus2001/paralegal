import { QueryCommand, BatchGetCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, FEEDBACKS_TABLE, CHUNK_ATTRIBUTIONS_TABLE } from "../clients/aws";
import paralegalVectorDbClient from "../clients/weaviate";
import type { Correction } from "../types/weaviate";
import { nanoid } from "nanoid";
import { AuditorSchema, type AuditorResult } from "../types/correction";
import { summarizerModel } from "../clients/openai";

export class CorrectionService {
  /**
   * Internal method to classify feedback against existing patches using an LLM.
   */
  private static async classifyFeedback(
    incorrectClaim: string,
    correctValue: string,
    existingCorrections: Correction[]
  ): Promise<AuditorResult> {
    if (!existingCorrections || existingCorrections.length === 0) {
      return {
        classification: "NEW",
        matching_claim_id: null,
        reasoning: "No existing corrections to compare against.",
      };
    }

    const structuredModel = summarizerModel.withStructuredOutput(AuditorSchema);

    const existingCorrectionsText = existingCorrections
      .map(
        (c) =>
          `- [claim_id: ${c.claim_id}] incorrect_claim: "${c.incorrect_claim}" | correct_value: "${c.correct_value}"`
      )
      .join("\n");

    const prompt = `
You are auditing corrections on a knowledge base chunk.
Existing corrections for this chunk:
${existingCorrectionsText}

New correction submitted by a user:
incorrect_claim: "${incorrectClaim}"
correct_value: "${correctValue}"

Classify the new correction as exactly one of:
- NEW: addresses a claim not covered by any existing correction.
- VOTE: agrees with an existing correction (return the claim_id it matches).
- CONTRADICTION: conflicts with an existing correction (return the claim_id it conflicts with).
    `.trim();

    try {
      const response = await structuredModel.invoke(prompt) as AuditorResult;
      return response;
    } catch (e) {
      console.error("LLM Auditor failed:", e);
      return {
        classification: "NEW",
        matching_claim_id: null,
        reasoning: "Fallback classification due to LLM error.",
      };
    }
  }

  /**
   * Synchronizes recent factual feedbacks into the Weaviate chunk's corrections array.
   */
  static async syncChunkCorrections(chunkId: string): Promise<void> {
    try {
      // 1. Fetch ALL current chunk mappings (Queue Dequeue)
      const mappingQuery = new QueryCommand({
        TableName: CHUNK_ATTRIBUTIONS_TABLE,
        KeyConditionExpression: "chunkId = :chunkId",
        ExpressionAttributeValues: {
          ":chunkId": chunkId,
        },
      });

      const mappingResponse = await dynamo.send(mappingQuery);
      const mappings = mappingResponse.Items || [];

      if (mappings.length === 0) {
        return; 
      }

      // 2. Fetch the actual Feedback records
      const batchGetCommand = new BatchGetCommand({
        RequestItems: {
          [FEEDBACKS_TABLE]: {
            Keys: mappings.map((m) => ({
              responseId: m.responseId,
              createdAt: m.createdAt,
            })),
          },
        },
      });

      const feedbacksResponse = await dynamo.send(batchGetCommand);
      const rawFeedbacks = feedbacksResponse.Responses?.[FEEDBACKS_TABLE] || [];

      // Only factual errors are used for patching
      const factualFeedbacks = rawFeedbacks.filter(
        (f) =>
          f.feedbackType === "Factually incorrect" || f.feedbackType === "Fabricated information"
      );

      // Only run LLM Auditor and Weaviate sync if there are factual issues to evaluate
      if (factualFeedbacks.length > 0) {
        // 3. Fetch existing corrections from Weaviate
        const existingCorrections = await paralegalVectorDbClient.getChunkCorrections(chunkId);
        
        const updatedCorrections: Correction[] = [...existingCorrections];
        let hasChanges = false;

        // 4. Run the Auditor against each new factual feedback
        for (const feedback of factualFeedbacks) {
          const incorrectClaim = feedback.incorrectClaim || "Unknown claim";
          const correctValue = feedback.correctValue || "Unknown value";

          const auditResult = await this.classifyFeedback(
            incorrectClaim,
            correctValue,
            updatedCorrections
          );

          if (auditResult.classification === "NEW") {
            updatedCorrections.push({
              claim_id: nanoid(),
              incorrect_claim: incorrectClaim,
              correct_value: correctValue,
              vote_count: 1,
              contested: false,
              attribution_confidence: 1.0, 
              attached_at: new Date().toISOString(),
              last_voted_at: new Date().toISOString(),
            });
            hasChanges = true;
          } else if (auditResult.classification === "VOTE" && auditResult.matching_claim_id) {
            const match = updatedCorrections.find((c) => c.claim_id === auditResult.matching_claim_id);
            if (match) {
              match.vote_count += 1;
              match.last_voted_at = new Date().toISOString();
              hasChanges = true;
            }
          } else if (auditResult.classification === "CONTRADICTION" && auditResult.matching_claim_id) {
            const match = updatedCorrections.find((c) => c.claim_id === auditResult.matching_claim_id);
            if (match) {
              match.contested = true;
              match.last_voted_at = new Date().toISOString();
              
              // Append the new conflicting value as well, marked as contested
              updatedCorrections.push({
                claim_id: nanoid(),
                incorrect_claim: incorrectClaim,
                correct_value: correctValue,
                vote_count: 1,
                contested: true,
                attribution_confidence: 1.0,
                attached_at: new Date().toISOString(),
                last_voted_at: new Date().toISOString(),
              });
              hasChanges = true;
            }
          }
        }

        // 5. Save the updated corrections back to Weaviate
        if (hasChanges) {
          await paralegalVectorDbClient.updateChunkCorrections(chunkId, updatedCorrections);
          console.log(`[CorrectionSync] Applied patches to chunk ${chunkId}. Total unique claims: ${updatedCorrections.length}`);
        }
      }

      // 7. Dequeue (Delete) ALL processed mappings (Factual and Non-Factual)
      const deleteRequests = mappings.map((m) => ({
        DeleteRequest: {
          Key: {
            chunkId: m.chunkId,
            createdAt_responseId: m.createdAt_responseId,
          },
        },
      }));

      // DynamoDB BatchWriteItem is limited to 25 items per request 
      for (let i = 0; i < deleteRequests.length; i += 25) {
        const batch = deleteRequests.slice(i, i + 25);
        await dynamo.send(
          new BatchWriteCommand({
            RequestItems: {
              [CHUNK_ATTRIBUTIONS_TABLE]: batch,
            },
          })
        );
      }
      console.log(`[CorrectionSync] Dequeued ${mappings.length} mappings for chunk ${chunkId}.`);

    } catch (error) {
      console.error(`Failed to sync chunk corrections for chunk ${chunkId}:`, error);
      throw error;
    }
  }
}

