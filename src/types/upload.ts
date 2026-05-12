import { z } from "zod";

export const presignMetadataSchema = z
  .object({
    userId: z.string().max(64),
    caseId: z.string().max(64)
  })

export type PresignMetadata = z.infer<typeof presignMetadataSchema>;
