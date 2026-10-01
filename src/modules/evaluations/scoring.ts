/**
 * Deterministic evaluation scoring core: automatic criterion scoring,
 * server-side score validation, reproducible totals, and blind redaction.
 * Pure functions only — no IO, no AI, no server-only imports — so every
 * total is reproducible from stored criteria + scores.
 */

export type CriterionScoringMode = "MANUAL" | "AUTOMATIC";

/** Configuration for deterministic automatic scoring from application answers. */
export interface AutoScoringConfig {
  /** Application answer key holding the value to evaluate. */
  answerKey: string;
  /**
   * Values that earn full points deterministically (e.g. `["true"]` for a
   * yes/no answer, `["women-owned"]` for an attribute tag). Matching is exact
   * against stringified answers.
   */
  matchingValues: string[];
  /** Points awarded when no configured value matches (default 0). */
  fallbackScore?: number;
}

/** Minimal criterion shape used by the scoring core. */
export interface ScoringCriterion {
  id: string;
  name: string;
  maximumScore: number;
  displayOrder: number;
  isActive: boolean;
  scoringMode: CriterionScoringMode;
  autoConfig: AutoScoringConfig | null;
}

/** Per-criterion evaluation scores keyed by criterion id. */
export type CriterionScores = Record<string, number>;

/** Result of validating/normalizing a score payload against criteria. */
export interface ScoreValidation {
  scores: CriterionScores;
  warnings: string[];
  errors: string[];
  complete: boolean;
}

function stringifyAnswer(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

/**
 * Deterministically scores an AUTOMATIC criterion from the application's own
 * answers. The LLM is never involved; matching values are configured by the
 * municipality on the criterion.
 */
export function scoreAutomaticCriterion(criterion: ScoringCriterion, answers: Record<string, unknown>): number {
  if (!criterion.autoConfig) return 0;
  const raw = stringifyAnswer(answers[criterion.autoConfig.answerKey]);
  const matches = criterion.autoConfig.matchingValues.some((candidate) => candidate.toLowerCase() === raw.toLowerCase());
  if (matches) return criterion.maximumScore;
  return Math.min(Math.max(criterion.autoConfig.fallbackScore ?? 0, 0), criterion.maximumScore);
}

/**
 * Validates evaluator-submitted scores against the grant's active criteria.
 * AUTOMATIC criteria are scored server-side from trusted answers and replace
 * any client-suggested value for them. Unknown/inactive criteria are rejected
 * so clients cannot smuggle extra keys into the stored record.
 */
export function validateEvaluationScores(
  criteria: ScoringCriterion[],
  submitted: Record<string, unknown>,
  answers: Record<string, unknown>,
): ScoreValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const scores: CriterionScores = {};

  const automatic = criteria.filter((criterion) => criterion.isActive && criterion.scoringMode === "AUTOMATIC");
  for (const criterion of automatic) {
    scores[criterion.id] = scoreAutomaticCriterion(criterion, answers);
  }

  for (const criterion of criteria.filter((criterion) => criterion.isActive && criterion.scoringMode === "MANUAL")) {
    const raw = submitted[criterion.id];
    if (raw === undefined || raw === null || raw === "") {
      warnings.push(`No score entered for "${criterion.name}".`);
      continue;
    }
    const value = typeof raw === "string" ? Number(raw.trim()) : raw;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`Score for "${criterion.name}" must be a number.`);
      continue;
    }
    if (value < 0 || value > criterion.maximumScore) {
      errors.push(`Score for "${criterion.name}" must be between 0 and ${criterion.maximumScore}.`);
      continue;
    }
    scores[criterion.id] = Math.round(value * 100) / 100;
  }

  const submittedKeys = Object.keys(submitted ?? {});
  const activeIds = new Set(criteria.filter((criterion) => criterion.isActive).map((criterion) => criterion.id));
  for (const key of submittedKeys) {
    if (!activeIds.has(key)) errors.push(`Unknown or inactive criterion "${key}".`);
  }

  const manualCriteria = criteria.filter((criterion) => criterion.isActive && criterion.scoringMode === "MANUAL");
  const complete = manualCriteria.length > 0
    ? manualCriteria.every((criterion) => scores[criterion.id] !== undefined)
    : true;

  return { scores, warnings, errors, complete };
}

/** Deterministic, reproducible total: sum of stored per-criterion scores. */
export function calculateTotalScore(scores: CriterionScores): number {
  return Object.values(scores).reduce((total, value) => total + value, 0);
}

/**
 * Rounds the stored total to the evaluations.score column precision and only
 * when every manual criterion is scored, keeping "incomplete" distinguishable.
 */
export function resolveStoredTotal(total: number, complete: boolean): number | null {
  if (!complete) return null;
  return Math.round(total * 100) / 100;
}

/** Answers considered identifying; always removed for blind evaluation. */
const IDENTIFYING_ANSWER_KEYS = ["organisationName", "contactName", "contactEmail", "contactPhone", "registrationNumber", "contactRole", "applicantName", "email", "phone", "name"] as const;

/** Answers redacted in blind phase, keyed by exact match. */
const BLIND_REDACTED_EXACT = new Set<string>(["organisationType", "yearEstablished"]);

/**
 * Removes applicant-identifying information from application data for blind
 * evaluation. Identity must not leak through answers, so known identifying
 * keys are dropped and any free-text longer answers are kept (project
 * description etc. are required for technical evaluation).
 */
export function redactAnswersForBlindPhase(answers: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers ?? {})) {
    if ((IDENTIFYING_ANSWER_KEYS as readonly string[]).includes(key)) continue;
    redacted[key] = value;
  }
  return redacted;
}

/**
 * Normalizes document/file names for blind evaluation: hashed, shortened and
 * free of applicant-controlled identifying text.
 */
export function blindDocumentName(index: number, extension: string): string {
  const safeExtension = /^[a-z0-9]{1,5}$/i.test(extension) ? extension.toLowerCase() : "doc";
  return `document-${index + 1}.${safeExtension}`;
}

/** True when the two stored evaluation records conflict on update. */
export function isStaleEvaluation(currentUpdatedAt: string, expectedUpdatedAt: string): boolean {
  return currentUpdatedAt !== expectedUpdatedAt;
}
