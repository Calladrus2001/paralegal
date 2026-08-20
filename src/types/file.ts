import { z } from "zod";

export const FileStatusSchema = z.enum(["PROCESSING", "PROCESSED", "ERROR"]);
export type FileStatus = z.infer<typeof FileStatusSchema>;

export const ChatFileSchema = z.object({
  chatId: z.string().min(1),
  fileId: z.string().min(1),
  userId: z.string().min(1),
  fileName: z.string().min(1),
  status: FileStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  errorMessage: z.string().optional(),
});

export type ChatFile = z.infer<typeof ChatFileSchema>;

export const GetChatFilesParamsSchema = z.object({
  chatId: z.string().min(1),
});

export type GetChatFilesParams = z.infer<typeof GetChatFilesParamsSchema>;
