import { z } from "zod";

export const querySchema = z.object({
  userId: z.string(),
  query: z.string().min(1),
  // optional parameters for ranking/filters
  topK: z.number().int().min(1).max(100).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type QueryRequest = z.infer<typeof querySchema>;
