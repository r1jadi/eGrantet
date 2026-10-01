import { z } from "zod";

/** The decision itself is always made by the municipality; AI only words it. */
export type DecisionLetterKind = "ACCEPTANCE" | "REJECTION";

/**
 * Structured, trusted facts handed to the AI. Every field is derived from
 * application/review data on the server; rejection reasons are mandatory for
 * rejections and must originate from deterministic checks or documented
 * review findings — never from the client or the model.
 */
export interface DecisionLetterFacts {
  decision: DecisionLetterKind;
  grantTitle: string;
  applicantName: string;
  organisationName: string | null;
  reference: string;
  submittedAt: string | null;
  /** Concrete, verified reasons required for rejections; optional context for acceptances. */
  reasons: string[];
  /** Verified review observations (passed checks, document status). Optional context. */
  positiveNotes: string[];
  requestedAmount: { amount: number; currency: string } | null;
  language?: string;
}

/** Structured letter returned by the provider adapter. */
export interface DecisionLetterResult {
  subject: string;
  body: string;
}

/** Provider-independent contract for decision-letter wording. */
export interface DecisionLetterService {
  generateDecisionLetter(facts: DecisionLetterFacts): Promise<DecisionLetterResult>;
}

/** Validates adapter output so malformed model responses never reach callers. */
export const decisionLetterResultSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
});

/** Builds the deterministic instruction payload. Facts in, wording out. */
export function buildDecisionLetterPrompt(facts: DecisionLetterFacts): string {
  const lines: string[] = [
    "You write official municipal grant decision letters on behalf of a municipality.",
    "Use ONLY the facts provided. Do not invent reasons, amounts, dates, or promises.",
    "Be formal, clear, and respectful. Do not exaggerate. Do not add legal advice.",
    "The decision itself has already been made by the municipality; you are only wording it.",
    "",
    `Decision: ${facts.decision}`,
    `Grant: ${facts.grantTitle}`,
    `Reference: ${facts.reference}`,
    `Applicant: ${facts.applicantName}`,
    facts.organisationName ? `Organisation: ${facts.organisationName}` : "",
    facts.submittedAt ? `Submitted: ${facts.submittedAt}` : "",
    facts.requestedAmount ? `Requested amount: ${facts.requestedAmount.amount} ${facts.requestedAmount.currency}` : "",
    facts.language ? `Write the letter in ${facts.language}.` : "Write the letter in English.",
    "",
  ].filter((line) => line !== "");

  if (facts.decision === "REJECTION") {
    if (facts.reasons.length === 0) {
      throw new Error("A rejection letter requires at least one verified reason.");
    }
    lines.push("The application is rejected for exactly these verified reasons:");
    for (const reason of facts.reasons) lines.push(`- ${reason}`);
    lines.push("");
    lines.push("Mention every listed reason. Do not soften or remove them. Do not add other reasons.");
  } else {
    lines.push("The application is accepted.");
    if (facts.positiveNotes.length > 0) {
      lines.push("Verified positive observations you may mention:");
      for (const note of facts.positiveNotes) lines.push(`- ${note}`);
    }
    if (facts.reasons.length > 0) {
      lines.push("Additional official notes you may mention:");
      for (const reason of facts.reasons) lines.push(`- ${reason}`);
    }
  }
  lines.push("");
  lines.push('Respond with JSON only: {"subject": string, "body": string}. The body is plain text with short paragraphs separated by blank lines. No placeholders left unfilled, no signatures block.');
  return lines.join("\n");
}

/** Parses and validates a raw model response into a structured letter. */
export function parseDecisionLetterResponse(raw: string): DecisionLetterResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    // Tolerate models that wrap JSON in code fences or prose.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response was not valid JSON.");
    parsedJson = JSON.parse(match[0]);
  }
  const result = decisionLetterResultSchema.safeParse(parsedJson);
  if (!result.success) throw new Error("AI response did not match the expected letter shape.");
  return result.data;
}
