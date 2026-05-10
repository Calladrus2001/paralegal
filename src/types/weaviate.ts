import type { ReputationTier } from "./reputation";

export interface ParalegalRecord {
  id?: string;
  [key: string]: any;
  text: string;
  chunk_index: number;
  userId: string;
  fileId: string;
  feedback_score?: number;
  feedback_tier?: ReputationTier;
  corrections?: string;
}

export interface Correction {
  claim_id: string;
  incorrect_claim: string;
  correct_value: string;
  vote_count: number;
  contested: boolean;
  attribution_confidence: number;
  attached_at: string;
  last_voted_at: string;
}
