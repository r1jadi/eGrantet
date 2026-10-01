import "server-only";
import type { Evaluation, EvaluationCriterion } from "../types";

/** Persistence boundary; scoring and assignment workflows are deliberately absent. */
export interface EvaluationRepository {
  listCriteria(grantId: string): Promise<EvaluationCriterion[]>;
  listForApplication(applicationId: string): Promise<Evaluation[]>;
}
