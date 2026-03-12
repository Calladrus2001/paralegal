import { z } from "zod";

export const SearchQuerySchema = z.object({
  userId: z.string().describe("UserId of the current user"),
  query: z.string().min(10).describe("The query to be handled by the agent"),
  fileId: z.string().describe("fileId of the user associated with the query"),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const ChatRequestSchema = SearchQuerySchema.extend({
  chatId: z.string().describe("Unique identifier for the chat session context"),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
