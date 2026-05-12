import { z } from "zod";

export const AuditorSchema = z.object({
  classification: z.enum(["NEW", "VOTE", "CONTRADICTION"]),
  matching_claim_id: z.string().max(64).nullable().describe("The claim_id it matches or conflicts with, if applicable"),
  reasoning: z.string().max(1000).describe("One sentence explaining the classification"),
});

export type AuditorResult = z.infer<typeof AuditorSchema>;
