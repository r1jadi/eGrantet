import { z } from "zod";

/**
 * Structured, trusted application facts handed to the AI. Every field is
 * derived server-side from the application's own submitted answers and the
 * grant context; nothing is accepted from the client or invented by the model.
 */
export interface ApplicationSummaryFacts {
  grantTitle: string;
  applicantName: string | null;
  organisationName: string | null;
  reference: string;
  /** Submitted answers keyed by their application answer key. */
  answers: Record<string, string>;
  requestedAmount: { amount: number; currency: string } | null;
  language?: string;
}

/** Structured summary returned by the provider adapter. */
export interface ApplicationSummaryResult {
  summary: string;
}

/**
 * Provider-independent application summarization. Replaces the earlier
 * `summarizeApplication(applicationId)` signature: the AI layer must stay
 * provider-pure, so structured facts are passed in and the domain service
 * keeps ownership of loading/trusting application data.
 */
export interface ApplicationSummaryService {
  generateApplicationSummary(facts: ApplicationSummaryFacts): Promise<ApplicationSummaryResult>;
}

/** Validates adapter output: 3–4 sentences, bounded length. */
export const applicationSummaryResultSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .refine((value) => countSentences(value) >= 3 && countSentences(value) <= 4, {
      message: "The summary must be 3–4 sentences.",
    }),
});

/** Sentence count ignoring common abbreviation pitfalls (e.g. "No. 5", "approx."). */
export function countSentences(text: string): number {
  const normalized = text.replace(/\b(?:No|approx|etc|vs|Dr|Mr|Mrs|Ms|St)\.\s/gi, "$1 ");
  const matches = normalized.match(/[^.!?]+[.!?]+(\s|$)/g);
  const counted = matches ? matches.length : normalized.trim() ? 1 : 0;
  return counted;
}

/** Human-readable labels for the answer keys the review UI already recognizes. */
const answerLabels: Record<string, string> = {
  projectTitle: "Project title",
  projectSummary: "Project summary",
  projectDescription: "Project description",
  projectGoals: "Project goals",
  projectObjectives: "Objectives",
  projectActivities: "Planned activities",
  targetGroup: "Target group",
  targetBeneficiaries: "Target beneficiaries",
  communityImpact: "Community impact",
  expectedReach: "People expected to reach",
  projectStart: "Project start",
  budgetAmount: "Budget requested",
  organisationName: "Organisation",
  organisationType: "Organisation type",
  yearEstablished: "Year established",
};

export function describeAnswerKey(key: string): string {
  return answerLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Builds the deterministic instruction payload. The model receives only the
 * application's own submitted data and may not add facts, judgements, or
 * decisions of any kind.
 */
export function buildApplicationSummaryPrompt(facts: ApplicationSummaryFacts): string {
  const lines: string[] = [
    "You summarize a grant application for a municipal grants officer.",
    "Use ONLY the submitted application data below. Do not invent facts, amounts, dates, results, scores, eligibility, or funding decisions.",
    "Write exactly 3–4 concise, professional sentences in one paragraph.",
    "Cover: what the project is, what it will do (activities/objectives), who benefits, and the requested amount when available.",
    "Facts that are not provided must simply be omitted; do not fill gaps.",
    facts.language ? `Write in ${facts.language}.` : "Write in English.",
    "",
    `Grant: ${facts.grantTitle}`,
    `Reference: ${facts.reference}`,
  ];
  if (facts.applicantName) lines.push(`Applicant: ${facts.applicantName}`);
  if (facts.organisationName) lines.push(`Organisation: ${facts.organisationName}`);
  if (facts.requestedAmount) lines.push(`Requested amount: ${facts.requestedAmount.amount} ${facts.requestedAmount.currency}`);
  lines.push("", "Submitted application data:");

  const entries = Object.entries(facts.answers);
  if (entries.length === 0) lines.push("(no free-text answers were submitted)");
  for (const [key, value] of entries) lines.push(`- ${describeAnswerKey(key)}: ${value}`);

  lines.push("");
  lines.push('Respond with JSON only: {"summary": string}.');
  return lines.join("\n");
}

/** Parses and validates a raw model response into a structured summary. */
export function parseApplicationSummaryResponse(raw: string): ApplicationSummaryResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response was not valid JSON.");
    parsedJson = JSON.parse(match[0]);
  }
  const result = applicationSummaryResultSchema.safeParse(parsedJson);
  if (!result.success) throw new Error("AI response did not match the required 3–4 sentence summary shape.");
  return result.data;
}
