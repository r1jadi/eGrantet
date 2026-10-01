import { z } from "zod";

/**
 * Requirement verification evaluation core.
 *
 * Deterministic rules evaluate first and are authoritative. AI document
 * analysis only supplies *evidence* (extracted fields) for rules that need
 * document facts; the AI never produces the final requirement verdict for a
 * deterministic rule, and never decides funding.
 */

export const REQUIREMENT_VERIFICATION_RESULTS = ["PASS", "FAIL", "NEEDS_REVIEW", "NOT_VERIFIABLE"] as const;
export type RequirementVerificationResult = (typeof REQUIREMENT_VERIFICATION_RESULTS)[number];

export const VERIFICATION_SOURCES = ["DETERMINISTIC", "AI", "SYSTEM"] as const;
export type VerificationSource = (typeof VERIFICATION_SOURCES)[number];

export const VERIFICATION_STATUSES = ["NOT_STARTED", "PROCESSING", "COMPLETED", "NEEDS_REVIEW", "FAILED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** One traceable piece of evidence behind a requirement outcome. */
export interface RequirementEvidence {
  /** Where the evidence came from: the application answers or a document. */
  source: "APPLICATION_DATA" | "DOCUMENT";
  /** Document id when source is DOCUMENT. */
  documentId?: string;
  /** Exact quote from the source (document text or field value). */
  quote: string;
  /** The extracted/observed value. */
  value: string;
}

/** Fully-structured outcome for a single grant requirement. */
export interface RequirementVerification {
  requirementId: string;
  requirementName: string;
  requirementType: string;
  isRequired: boolean;
  result: RequirementVerificationResult;
  source: VerificationSource;
  /** Lifecycle row status for this finding (COMPLETED unless evaluation failed). */
  status: Exclude<VerificationStatus, "NOT_STARTED" | "PROCESSING">;
  evidence: RequirementEvidence[];
  explanation: string;
  confidence: number | null;
}

/** Shape of requirement configuration the deterministic engine understands. */
export interface RequirementRuleConfig {
  answerKey?: string;
  expectedAnswer?: string;
  minimumValue?: number;
  maximumValue?: number;
  minimumYears?: number;
  dateAnswerKey?: string;
  documentTypeHint?: string;
}

/** Application-side inputs for evaluation. */
export interface RequirementEvaluationContext {
  requirement: {
    id: string;
    name: string;
    type: string;
    isRequired: boolean;
    configuration: Record<string, unknown>;
  };
  /** Submitted application answers (string values only are compared). */
  answers: Record<string, unknown>;
  /** The application submission date (for duration rules). */
  applicationDate: Date;
  /** Grant-level funding limit (FINANCIAL amount rule). */
  grantMaximumAmount: number | null;
  requestedAmount: number | null;
  currency: string | null;
  /** Document analyses attached to this application, per requirement. */
  documentAnalyses: Array<{
    documentId: string;
    requirementId: string | null;
    fileName: string;
    status: string;
    extractedFields: Array<{ name: string; value: string; sourceQuote: string }>;
  }>;
}

/** Documents a requirement can rely on (its own attached docs first). */
function documentsFor(requirementId: string, analyses: RequirementEvaluationContext["documentAnalyses"]) {
  return analyses.filter((analysis) => analysis.requirementId === requirementId && analysis.status === "VERIFIED");
}

function toEvidenceFromDocument(analysis: RequirementEvaluationContext["documentAnalyses"][number], fields: Array<{ name: string; value: string }>): RequirementEvidence[] {
  const evidence: RequirementEvidence[] = [];
  for (const field of fields) {
    const match = analysis.extractedFields.find((candidate) => candidate.name.toLowerCase() === field.name.toLowerCase());
    if (match) {
      evidence.push({ source: "DOCUMENT", documentId: analysis.documentId, quote: match.sourceQuote, value: match.value });
    }
  }
  return evidence;
}

function stringAnswer(answers: Record<string, unknown>, key: string | undefined): string | null {
  if (!key) return null;
  const value = answers[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericAnswer(answers: Record<string, unknown>, key: string | undefined): number | null {
  const raw = stringAnswer(answers, key);
  if (raw === null) return null;
  const parsed = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateAnswer(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Evaluates one requirement deterministically. Returns null when the rule
 * cannot be evaluated from application data alone and needs document evidence
 * (the caller may then consult AI-extracted fields).
 */
export function evaluateRequirementDeterministically(context: RequirementEvaluationContext): RequirementVerification | null {
  const { requirement } = context;
  const config = requirement.configuration as RequirementRuleConfig;
  const base = {
    requirementId: requirement.id,
    requirementName: requirement.name,
    requirementType: requirement.type,
    isRequired: requirement.isRequired,
    source: "DETERMINISTIC" as const,
    status: "COMPLETED" as const,
    evidence: [] as RequirementEvidence[],
    confidence: 1,
  };

  // FINANCIAL: maximum amount check (deterministic from application data).
  if (requirement.type === "FINANCIAL") {
    const limit = config.maximumValue ?? context.grantMaximumAmount;
    if (limit === null || context.requestedAmount === null) {
      return { ...base, result: "NOT_VERIFIABLE", explanation: "No requested amount or configured limit available to verify this requirement.", confidence: null };
    }
    const passed = context.requestedAmount <= limit;
    return {
      ...base,
      result: passed ? "PASS" : "FAIL",
      evidence: [{ source: "APPLICATION_DATA", quote: String(context.requestedAmount), value: `${context.requestedAmount} ${context.currency ?? ""}`.trim() }],
      explanation: passed
        ? `The requested amount ${context.requestedAmount} is within the limit of ${limit}.`
        : `The requested amount ${context.requestedAmount} exceeds the limit of ${limit}.`,
    };
  }

  // APPLICANT/ELIGIBILITY with an expected answer: deterministic equality check.
  if ((requirement.type === "APPLICANT" || requirement.type === "ELIGIBILITY") && config.answerKey && config.expectedAnswer !== undefined) {
    const answer = stringAnswer(context.answers, config.answerKey);
    if (answer === null) {
      return {
        ...base,
        result: requirement.isRequired ? "FAIL" : "NEEDS_REVIEW",
        explanation: "The required application answer was not provided.",
        confidence: null,
      };
    }
    const passed = answer.toLowerCase() === String(config.expectedAnswer).toLowerCase();
    return {
      ...base,
      result: passed ? "PASS" : "FAIL",
      evidence: [{ source: "APPLICATION_DATA", quote: answer, value: answer }],
      explanation: passed
        ? `The application answer matches the expected value.`
        : `The application answer "${answer}" does not match the expected value "${config.expectedAnswer}".`,
    };
  }

  // Duration rule: a date answer must be at least N years before the application date.
  if (requirement.type === "ELIGIBILITY" && config.answerKey && config.minimumYears !== undefined) {
    const raw = stringAnswer(context.answers, config.answerKey);
    const date = raw ? parseDateAnswer(raw) : null;
    if (!date) {
      return {
        ...base,
        result: "NEEDS_REVIEW",
        explanation: "No valid date found in the application data for this requirement.",
        confidence: null,
      };
    }
    const years = (context.applicationDate.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const passed = years >= config.minimumYears;
    return {
      ...base,
      result: passed ? "PASS" : "FAIL",
      evidence: [{ source: "APPLICATION_DATA", quote: raw as string, value: raw as string }],
      explanation: passed
        ? `The recorded date (${raw}) is at least ${config.minimumYears} year(s) before the application date.`
        : `The recorded date (${raw}) is less than ${config.minimumYears} year(s) before the application date.`,
    };
  }

  // Presence rule: a required answer key must be filled.
  if (config.answerKey && (requirement.type === "PROJECT" || requirement.type === "APPLICANT" || requirement.type === "OTHER" || requirement.type === "ELIGIBILITY")) {
    const answer = stringAnswer(context.answers, config.answerKey);
    if (answer === null) {
      return {
        ...base,
        result: requirement.isRequired ? "FAIL" : "NEEDS_REVIEW",
        explanation: "The required application information was not provided.",
        confidence: null,
      };
    }
    return {
      ...base,
      result: "PASS",
      evidence: [{ source: "APPLICATION_DATA", quote: answer.slice(0, 200), value: answer.slice(0, 200) }],
      explanation: "The required application information was provided.",
    };
  }

  // No deterministic rule applies — the caller may fall back to document evidence.
  return null;
}

/**
 * Evaluates a DOCUMENT requirement: a verified analysis for an attached
 * document passes; missing/unreadable/flagged analyses fail or need review.
 */
export function evaluateDocumentRequirement(context: RequirementEvaluationContext): RequirementVerification {
  const { requirement } = context;
  const attached = context.documentAnalyses.filter((analysis) => analysis.requirementId === requirement.id);
  const verified = attached.filter((analysis) => analysis.status === "VERIFIED");
  const base = {
    requirementId: requirement.id,
    requirementName: requirement.name,
    requirementType: requirement.type,
    isRequired: requirement.isRequired,
    source: "AI" as const,
    status: "COMPLETED" as const,
    evidence: [] as RequirementEvidence[],
    confidence: null as number | null,
  };

  if (verified.length === 0) {
    const unreadable = attached.some((analysis) => analysis.status === "UNREADABLE");
    return {
      ...base,
      result: unreadable ? "NEEDS_REVIEW" : requirement.isRequired ? "FAIL" : "NEEDS_REVIEW",
      status: "COMPLETED",
      explanation: unreadable
        ? "The submitted document could not be read reliably and requires manual review."
        : "No valid document supporting this requirement was found among the submissions.",
      evidence: attached.map((analysis) => ({ source: "DOCUMENT" as const, documentId: analysis.documentId, quote: analysis.fileName, value: analysis.status })),
    };
  }

  const primary = verified[0];
  const documentTypeEvidence = toEvidenceFromDocument(primary, [{ name: "documentType", value: "verified document" }]);
  return {
    ...base,
    result: "PASS",
    explanation: `A supporting document (${primary.fileName}) was verified.`,
    evidence: documentTypeEvidence.length
      ? documentTypeEvidence
      : [{ source: "DOCUMENT", documentId: primary.documentId, quote: primary.fileName, value: "Document verified" }],
    confidence: null,
  };
}

/**
 * AI-grounded fallback for ELIGIBILITY rules that could not be evaluated
 * deterministically: the AI supplies evidence from documents, but the verdict
 * remains NEEDS_REVIEW unless the extracted evidence clearly satisfies the
 * requirement — in which case it is still labeled AI-sourced so reviewers can
 * distinguish it from deterministic outcomes.
 */
export function evaluateRequirementWithDocumentEvidence(
  context: RequirementEvaluationContext,
  rule: { minimumYears?: number; expectedAnswer?: string; answerKey?: string },
): RequirementVerification {
  const { requirement } = context;
  const base = {
    requirementId: requirement.id,
    requirementName: requirement.name,
    requirementType: requirement.type,
    isRequired: requirement.isRequired,
    source: "AI" as const,
    status: "COMPLETED" as const,
    evidence: [] as RequirementEvidence[],
    confidence: null as number | null,
  };
  const analyses = documentsFor(requirement.id, context.documentAnalyses);
  if (analyses.length === 0) {
    return {
      ...base,
      result: requirement.isRequired ? "NEEDS_REVIEW" : "NOT_VERIFIABLE",
      explanation: "No verified document evidence is available to evaluate this requirement.",
    };
  }
  const evidence = analyses.flatMap((analysis) => analysis.extractedFields.map((field) => ({ source: "DOCUMENT" as const, documentId: analysis.documentId, quote: field.sourceQuote, value: field.value })));
  // The AI never concludes PASS on its own for eligibility rules: it is
  // surfaced as NEEDS_REVIEW with the evidence attached for the reviewer.
  return {
    ...base,
    result: "NEEDS_REVIEW",
    evidence,
    explanation: "AI-extracted document evidence is available; a reviewer must confirm whether it satisfies this requirement.",
    confidence: null,
  };
}
