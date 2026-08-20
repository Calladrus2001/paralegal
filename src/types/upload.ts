import { z } from "zod";

export const presignMetadataSchema = z.object({
  userId: z.string().min(1).max(64),
  chatId: z.string().min(1).max(64).optional(),
  fileName: z.string().min(1).max(255).optional(),
});

export type PresignMetadata = z.infer<typeof presignMetadataSchema>;
