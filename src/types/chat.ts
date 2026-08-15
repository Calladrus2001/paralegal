import { z } from "zod";

export const GetUserChatsQuerySchema = z.object({
  userId: z.string().min(1).max(64).describe("User ID whose chats are being retrieved"),
});

export type GetUserChatsQuery = z.infer<typeof GetUserChatsQuerySchema>;

export const CreateChatRequestSchema = z.object({
  userId: z.string().min(1).max(64).describe("User ID creating the chat"),
  chatTitle: z.string().min(1).max(200).describe("Title of the consultation chat"),
  chatId: z.string().min(1).max(64).optional().describe("Optional pre-allocated Chat ID"),
});

export type CreateChatRequest = z.infer<typeof CreateChatRequestSchema>;

export const GetChatMessagesParamsSchema = z.object({
  chatId: z.string().min(1).max(64).describe("UUID of the chat session"),
});

export type GetChatMessagesParams = z.infer<typeof GetChatMessagesParamsSchema>;

export const DeleteChatParamsSchema = z.object({
  chatId: z.string().min(1).max(64).describe("UUID of the chat session to delete"),
});

export type DeleteChatParams = z.infer<typeof DeleteChatParamsSchema>;

export const DeleteChatQuerySchema = z.object({
  userId: z.string().min(1).max(64).describe("User ID owning the chat"),
});

export type DeleteChatQuery = z.infer<typeof DeleteChatQuerySchema>;

export interface ChatRecord {
  chatId: string;
  userId: string;
  chatTitle: string;
  createdAt: string;
}

export type Chat = ChatRecord;

export interface MessageRecord {
  responseId: string;
  chatId: string;
  userId: string;
  query: string;
  response: string;
  retrievedChunkIds?: string[];
  retrievedScores?: number[];
  model?: string;
  topK?: number;
  createdAt: string;
}

export type Message = MessageRecord;
