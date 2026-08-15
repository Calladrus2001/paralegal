import { z } from "zod";

export const SearchQuerySchema = z.object({
  userId: z.string().max(64).describe("UserId of the current user"),
  chatId: z.string().max(64).describe("Unique identifier for the chat session context"),
  query: z.string().min(1).max(2000).describe("The query to be handled by the agent"),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const ChatRequestSchema = SearchQuerySchema;

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
