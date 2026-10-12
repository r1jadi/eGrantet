import { z } from "zod";

/**
 * Provider-independent document-analysis contract.
 *
 * The AI receives only real extracted document content plus selected
 * application facts, and must ground every statement in that content. The
 * result is validated with Zod before it reaches any caller: malformed or
 * hallucinated model output never becomes verified evidence.
 */

/** Document types the analysis can recognize (kept deliberately broad). */
export const DOCUMENT_TYPES = [
  "BUSINESS_REGISTRATION_CERTIFICATE",
  "TAX_CERTIFICATE",
  "PROJECT_BUDGET",
  "BANK_ACCOUNT_CONFIRMATION",
  "ID_CARD",
  "OTHER",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Analysis outcome. UNREADABLE/NEEDS_REVIEW never count as verification success. */
export const DOCUMENT_ANALYSIS_STATUSES = ["VERIFIED", "FLAGGED", "UNREADABLE", "NEEDS_REVIEW"] as const;

export type DocumentAnalysisStatus = (typeof DOCUMENT_ANALYSIS_STATUSES)[number];

/** A single extracted field; `sourceQuote` must quote the document text. */
export interface ExtractedField {
  name: string;
  value: string;
  sourceQuote: string;
}

/** A problem found in the document (missing, inconsistent, suspicious, unclear). */
export interface DocumentFinding {
  kind: "MISSING" | "INCONSISTENT" | "SUSPICIOUS" | "UNCLEAR";
  description: string;
}

/** Structured analysis input. Content must already be extracted server-side. */
export interface DocumentAnalysisInput {
  fileName: string;
  declaredType: string;
  mimeType: string;
  /** Extracted text (PDF) or a transcribed/vision-provided description (images). */
  contentText: string;
  /** Application facts relevant for cross-checking (may be empty). */
  applicationFacts: Record<string, string>;
}

/** Structured analysis result returned by the provider adapter. */
export interface DocumentAnalysisResult {
  status: DocumentAnalysisStatus;
  documentType: DocumentType;
  confidence: number;
  extractedFields: ExtractedField[];
  missingInformation: string[];
  inconsistencies: DocumentFinding[];
  verificationNotes: string;
}

/** Service contract for provider adapters. */
export interface DocumentAnalysisService {
  analyzeDocument(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult>;
}

/** MIME types analyzed through the model's image (vision) input. */
export const VISION_MIME_TYPES = ["image/png", "image/jpeg"] as const;

/**
 * True when the document must be sent as an image. The configured default
 * model (`openai/gpt-oss-20b`) is text-only, so adapters fail these inputs
 * fast with a clear manual-review outcome instead of sending a doomed
 * multi-megabyte vision request to the provider.
 */
export function isVisionDocument(mimeType: string): boolean {
  return (VISION_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Strict response validation. Limits field counts and text lengths so a
 * runaway model response cannot flood storage, and requires `sourceQuote`
 * evidence for every extracted field (anti-hallucination contract).
 */
export const documentAnalysisResultSchema = z.object({
  status: z.enum(DOCUMENT_ANALYSIS_STATUSES),
  documentType: z.enum(DOCUMENT_TYPES),
  confidence: z.number().min(0).max(1),
  extractedFields: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        value: z.string().trim().min(1).max(500),
        sourceQuote: z.string().trim().min(1).max(500),
      }),
    )
    .max(30),
  missingInformation: z.array(z.string().trim().min(1).max(300)).max(20),
  inconsistencies: z
    .array(
      z.object({
        kind: z.enum(["MISSING", "INCONSISTENT", "SUSPICIOUS", "UNCLEAR"]),
        description: z.string().trim().min(1).max(500),
      }),
    )
    .max(20),
  verificationNotes: z.string().trim().max(2_000),
});

/** Application fact keys the consistency analysis may compare (small on purpose). */
const comparableFactLabels: Record<string, string> = {
  organisationName: "Applicant/organisation name",
  registrationNumber: "Registration number",
  projectTitle: "Project title",
  budgetAmount: "Requested amount",
  contactName: "Contact person",
  yearEstablished: "Year established",
};

/** Builds the deterministic instruction payload for document analysis. */
export function buildDocumentAnalysisPrompt(input: DocumentAnalysisInput): string {
  const factLines = Object.entries(input.applicationFacts);
  const lines: string[] = [
    "You analyze one document that belongs to a municipal grant application.",
    "Use ONLY the document content and the application facts provided. Never invent facts, dates, names, or amounts.",
    "Distinguish evidence (quoted from the document) from inference. If evidence is insufficient, return status NEEDS_REVIEW.",
    "If the content is unreadable, not the expected document, or effectively empty, return status UNREADABLE.",
    "Never decide funding, approval, or eligibility; eligibility is computed by deterministic rules outside this analysis.",
    "",
    `File name: ${input.fileName}`,
    `Declared document type: ${input.declaredType}`,
    "",
    "Application facts (for cross-checking only; may be empty):",
    ...(factLines.length === 0 ? ["(none provided)"] : factLines.map(([key, value]) => `- ${comparableFactLabels[key] ?? key}: ${value}`)),
    "",
    "Tasks:",
    "1. Identify the actual document type.",
    "2. Extract the relevant fields as short values, each with an exact short quote from the document as sourceQuote.",
    "3. List important missing information, inconsistencies with the application facts, suspicious content (e.g. edited dates), and unclear parts.",
    "4. Write concise verification notes for a municipal reviewer.",
    "",
    "Respond with JSON only, exactly this shape:",
    '{"status":"VERIFIED|FLAGGED|UNREADABLE|NEEDS_REVIEW","documentType":"BUSINESS_REGISTRATION_CERTIFICATE|TAX_CERTIFICATE|PROJECT_BUDGET|BANK_ACCOUNT_CONFIRMATION|ID_CARD|OTHER","confidence":0..1,"extractedFields":[{"name":"...","value":"...","sourceQuote":"..."}],"missingInformation":["..."],"inconsistencies":[{"kind":"MISSING|INCONSISTENT|SUSPICIOUS|UNCLEAR","description":"..."}],"verificationNotes":"..."}',
    "",
    "Document content:",
    "<<<DOCUMENT",
    input.contentText,
    "DOCUMENT>>>",
  ];
  return lines.join("\n");
}

/**
 * Parses and validates a raw model response. Throws a descriptive error on
 * malformed JSON or schema violations so callers can mark the analysis as
 * needing review instead of trusting bad output.
 */
export function parseDocumentAnalysisResponse(raw: string): DocumentAnalysisResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI document analysis response was not valid JSON.");
    parsedJson = JSON.parse(match[0]);
  }
  const result = documentAnalysisResultSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(`AI document analysis response did not match the required shape: ${result.error.issues[0]?.message ?? "unknown"}`);
  }
  return result.data;
}

/** Labels used by the prompt builder; exported for tests. */
export const comparableDocumentFactLabels = comparableFactLabels;
