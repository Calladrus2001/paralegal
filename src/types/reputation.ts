export type ReputationTier = "HEALTHY" | "WATCH" | "DEGRADE" | "FLAG";

export interface ChunkStats {
  chunkId: string;
  cumulativePenalty: number;
  totalRetrievals: number;
  weightedScore: number;
  tier: ReputationTier;
  lastEvaluatedAt: string;
  type?: string; // Optional for SK if needed, though we simplified to PK only
}
