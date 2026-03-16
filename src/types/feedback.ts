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

export const FeedbackRequestSchema = z.object({
  responseId: z.string().describe("UUID of the response being evaluated"),
  chatId: z.string().describe("UUID of the chat this response belongs to"),
  userId: z.string().describe("UUID of the user submitting feedback"),
  feedbackType: FeedbackTypeEnum,
  bucket: FeedbackBucketEnum,
  incorrectClaim: z.string().optional().describe("Only used for Factually incorrect / Fabricated"),
  correctValue: z.string().optional().describe("Only used for Factually incorrect / Fabricated"),
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

export interface FeedbackRecord extends FeedbackRequest {
  feedbackId: string;
  status: "PENDING" | "PROCESSED";
  createdAt: string;
  // Attributed chunk fields will be populated later by the Attribution Lambda
  attributedChunkIds?: string[];
  attributionConfidence?: number;
}
