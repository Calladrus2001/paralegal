import { z } from "zod";

export const presignMetadataSchema = z
  .object({
    userId: z.string(),
    caseId: z.string()
  })

export type PresignMetadata = z.infer<typeof presignMetadataSchema>;
