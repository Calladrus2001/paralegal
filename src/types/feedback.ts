import { z } from "zod";

export const FeedbackTypeEnum = z.enum([
  "Factually incorrect",
  "Fabricated information",
  "Irrelevant",
  "Insufficient detail",
  "Partial answer only",
  "Generic / boilerplate",
  "Misinterpreted intent",
]);

export const FeedbackBucketEnum = z.enum(["LLM", "Human"]);

export type FeedbackType = z.infer<typeof FeedbackTypeEnum>;
export type FeedbackBucket = z.infer<typeof FeedbackBucketEnum>;

export const SEVERITY_WEIGHTS: Record<FeedbackType, number> = {
  "Fabricated information": 1.0,
  "Factually incorrect": 0.9,
  "Irrelevant": 0.6,
  "Insufficient detail": 0.4,
  "Partial answer only": 0.3,
  "Generic / boilerplate": 0.2,
  "Misinterpreted intent": 0.2,
};

export const FeedbackRequestSchema = z.object({
  responseId: z.string().max(64).describe("UUID of the response being evaluated"),
  chatId: z.string().max(64).describe("UUID of the chat this response belongs to"),
  userId: z.string().max(64).describe("UUID of the user submitting feedback"),
  feedbackType: FeedbackTypeEnum,
  bucket: FeedbackBucketEnum,
  incorrectClaim: z.string().max(1000).optional().describe("Only used for Factually incorrect / Fabricated"),
  correctValue: z.string().max(1000).optional().describe("Only used for Factually incorrect / Fabricated"),
}).superRefine((data, ctx) => {
  // Enforce correctable fields for factuality issues
  const isFactualityIssue =
    data.feedbackType === "Factually incorrect" ||
    data.feedbackType === "Fabricated information";

  if (isFactualityIssue) {
    if (!data.incorrectClaim || data.incorrectClaim.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "incorrectClaim is required for factuality feedback",
        path: ["incorrectClaim"],
      });
    }
    if (!data.correctValue || data.correctValue.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "correctValue is required for factuality feedback",
        path: ["correctValue"],
      });
    }
  }
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

export type FeedbackSubmissionPayload = FeedbackRequest;
export type FeedbackStatus = "idle" | "submitting" | "submitted" | "error";

export interface FeedbackRecord extends FeedbackRequest {
  feedbackId: string;
  status: "PENDING" | "PROCESSED";
  createdAt: string;
  // Attributed chunk fields will be populated later by the Attribution Lambda
  attributedChunkIds?: string[];
  attributionConfidence?: number;
}

export const AttributionResultSchema = z.object({
  culpritChunkId: z.string().max(64).nullable().describe("The UUID of the chunk most likely responsible for the incorrect claim"),
  evidenceQuote: z.string().max(2000).describe("The specific sentence or phrase from the chunk that contains the error. If not found, use an empty string."),
  reasoning: z.string().max(1000).describe("Brief explanation of why this chunk was selected"),
  confidence: z.number().min(0).max(1).describe("The LLM's confidence in this attribution (0-1)")
});

export type AttributionResult = z.infer<typeof AttributionResultSchema>;
