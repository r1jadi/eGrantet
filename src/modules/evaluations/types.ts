import type { AutoScoringConfig, CriterionScoringMode } from "./scoring";

export const EVALUATION_STATUSES = ["DRAFT", "SUBMITTED"] as const;
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export interface EvaluationCriterion {
  id: string;
  grantId: string;
  name: string;
  description: string;
  maximumScore: number;
  weight: number;
  displayOrder: number;
  isActive: boolean;
  scoringMode: CriterionScoringMode;
  autoConfig: AutoScoringConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface Evaluation {
  id: string;
  applicationId: string;
  evaluatorId: string;
  score: number | null;
  comment: string | null;
  status: EvaluationStatus;
  /** Per-criterion scores keyed by criterion id (deterministic total source). */
  criterionScores: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}
