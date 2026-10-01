import { z } from "zod";

/**
 * Application verification synthesis.
 *
 * After deterministic checks and per-document analysis, one AI call turns the
 * collected evidence into reviewer-facing findings and an application summary.
 * The model only reorganizes provided evidence — it never decides funding and
 * never overrides deterministic outcomes.
 */

export const SYNTHESIS_FINDING_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;

export const synthesisFindingSchema = z.object({
  severity: z.enum(SYNTHESIS_FINDING_SEVERITIES),
  title: z.string().trim().min(1).max(200),
  detail: z.string().trim().min(1).max(1_000),
});

export const synthesisResultSchema = z.object({
  findings: z.array(synthesisFindingSchema).max(15),
  summary: z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .refine((value) => countSynthesisSentences(value) >= 3 && countSynthesisSentences(value) <= 5, {
      message: "The summary must be 3–5 sentences.",
    }),
});

export type SynthesisFinding = z.infer<typeof synthesisFindingSchema>;
export type SynthesisResult = z.infer<typeof synthesisResultSchema>;

/** Service contract for provider adapters. */
export interface VerificationSynthesisService {
  synthesize(input: VerificationSynthesisInput): Promise<SynthesisResult>;
}

/** Evidence handed to synthesis. All content is already validated upstream. */
export interface VerificationSynthesisInput {
  grantTitle: string;
  requestedAmount: { amount: number; currency: string } | null;
  submittedAt: string | null;
  /** Deterministic requirement outcomes (source of truth; the AI must not change them). */
  deterministicResults: Array<{ requirement: string; result: "PASSED" | "FAILED" | "PENDING"; explanation: string }>;
  /** Per-document analysis outcomes. */
  documentResults: Array<{ fileName: string; status: string; notes: string; inconsistencies: string[] }>;
  /** Missing required documents. */
  missingDocuments: string[];
  language?: string;
}

/** Sentence count used by the summary shape validation. */
export function countSynthesisSentences(text: string): number {
  const normalized = text.replace(/\b(?:No|approx|etc|vs|Dr|Mr|Mrs|Ms|St)\.\s/gi, "$1 ");
  const matches = normalized.match(/[^.!?]+[.!?]+(\s|$)/g);
  return matches ? matches.length : normalized.trim() ? 1 : 0;
}

/** Builds the synthesis instruction payload. */
export function buildVerificationSynthesisPrompt(input: VerificationSynthesisInput): string {
  const lines: string[] = [
    "You prepare a verification briefing for a municipal grants reviewer.",
    "Use ONLY the deterministic results, document analyses, and missing-document list provided. Never invent facts.",
    "Deterministic results are authoritative: never restate a PASSED/FAILED outcome differently.",
    "Do not decide funding, approval, or scoring; you are summarizing verification findings only.",
    "Flag uncertainty explicitly: if evidence is thin, say what the reviewer should check.",
    "",
    `Grant: ${input.grantTitle}`,
    input.requestedAmount ? `Requested amount: ${input.requestedAmount.amount} ${input.requestedAmount.currency}` : "Requested amount: not specified",
    input.submittedAt ? `Submitted: ${input.submittedAt}` : "",
    "",
    "Deterministic requirement results (authoritative):",
    ...(input.deterministicResults.length === 0
      ? ["(none)"]
      : input.deterministicResults.map((item) => `- [${item.result}] ${item.requirement}: ${item.explanation}`)),
    "",
    "Document analyses:",
    ...(input.documentResults.length === 0
      ? ["(no documents submitted)"]
      : input.documentResults.map((item) => `- ${item.fileName} [${item.status}] ${item.notes}${item.inconsistencies.length ? ` Inconsistencies: ${item.inconsistencies.join("; ")}` : ""}`)),
    "",
    "Missing required documents:",
    ...(input.missingDocuments.length === 0 ? ["(none)"] : input.missingDocuments.map((name) => `- ${name}`)),
    "",
    "Tasks:",
    "1. findings: the important issues a reviewer must look at (severity INFO/WARNING/CRITICAL). Include nothing when there is nothing to flag.",
    "2. summary: 3–5 professional sentences describing what is requested and the overall verification picture.",
    input.language ? `Write in ${input.language}.` : "Write in English.",
    "",
    'Respond with JSON only: {"findings":[{"severity":"INFO|WARNING|CRITICAL","title":"...","detail":"..."}],"summary":"..."}.',
  ];
  return lines.filter((line) => line !== "").join("\n");
}

/** Parses and validates a raw synthesis response. */
export function parseVerificationSynthesisResponse(raw: string): SynthesisResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI synthesis response was not valid JSON.");
    parsedJson = JSON.parse(match[0]);
  }
  const result = synthesisResultSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(`AI synthesis response did not match the required shape: ${result.error.issues[0]?.message ?? "unknown"}`);
  }
  return result.data;
}
