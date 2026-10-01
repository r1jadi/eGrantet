import type { ApplicationSummaryFacts } from "../ai/application-summary";
import type { MunicipalApplicationDetail } from "./types";

/** Answer keys that describe the project substance (vs. contact metadata). */
const PROJECT_STORY_KEYS = [
  "projectTitle",
  "projectSummary",
  "projectDescription",
  "projectGoals",
  "projectObjectives",
  "projectActivities",
  "communityImpact",
  "expectedReach",
  "budgetAmount",
] as const;

/** Free-text answers only; non-string values are skipped, whitespace trimmed, length-capped. */
export function collectSummaryAnswers(answers: Record<string, unknown>): Record<string, string> {
  const collected: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    collected[key] = trimmed.slice(0, 2_000);
  }
  return collected;
}

/** True when at least one project-descriptive field has usable content. */
export function hasUsableProjectData(answers: Record<string, unknown>): boolean {
  return PROJECT_STORY_KEYS.some((key) => {
    const value = answers[key];
    return (typeof value === "string" && value.trim().length > 0) || (typeof value === "number" && Number.isFinite(value));
  });
}

/**
 * Builds the trusted summary facts from a municipal application detail.
 * Every field originates from the application's own submitted answers or
 * verifiable grant metadata; the AI may restate but never extend them.
 * `getMunicipalApplicationDetail` has already enforced municipality access.
 */
export function buildApplicationSummaryFacts(detail: MunicipalApplicationDetail): ApplicationSummaryFacts {
  const requestedAmount =
    detail.grant.fundingAmount !== null && detail.grant.fundingAmount !== undefined
      ? { amount: detail.grant.fundingAmount, currency: detail.grant.fundingCurrency ?? "EUR" }
      : null;
  return {
    reference: detail.id.slice(0, 8).toUpperCase(),
    grantTitle: detail.grant.title,
    applicantName: detail.applicant.fullName ?? null,
    organisationName: detail.applicant.organisation ?? null,
    answers: collectSummaryAnswers(detail.answers ?? {}),
    requestedAmount,
  };
}
