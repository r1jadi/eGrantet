export interface EligibilityEvaluationInput { grantId: string; applicationId: string; facts: Record<string, unknown>; }
export interface EligibilityEvaluationResult { eligible: boolean; unmetRequirementIds: string[]; }
export interface EligibilityRuleEvaluator { evaluate(input: EligibilityEvaluationInput): Promise<EligibilityEvaluationResult>; }

export const ELIGIBILITY_RESULTS = ["PENDING", "PASSED", "FAILED"] as const;
export type EligibilityResult = (typeof ELIGIBILITY_RESULTS)[number];

export interface EligibilityCheck {
  id: string;
  applicationId: string;
  requirementId: string | null;
  result: EligibilityResult;
  reason: string | null;
  checkedAt: string | null;
  createdAt: string;
}
