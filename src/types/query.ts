import { z } from "zod";

export const querySchema = z.object({
  userId: z.string().describe("UserId of the current user"),
  query: z.string().min(10).describe("The query to be handled by the agent"),
  fileId: z.string().describe("fileId of the user associated with the query"),
});

export type QueryRequest = z.infer<typeof querySchema>;
