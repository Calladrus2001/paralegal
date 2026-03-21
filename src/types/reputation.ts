export interface ChunkStats {
  chunkId: string;
  cumulativePenalty: number;
  totalRetrievals: number;
  weightedScore: number;
  tier: "HEALTHY" | "WATCH" | "DEGRADE" | "FLAG";
  lastEvaluatedAt: string;
  type?: string; // Optinal for SK if needed, though we simplified to PK only
}
