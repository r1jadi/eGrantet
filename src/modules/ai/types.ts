export interface DocumentAnalysisInput { documentId: string; storagePath: string; mimeType: string; }
export interface DocumentAnalysisResult { status: "PENDING" | "COMPLETED" | "FAILED"; extractedData: Record<string, unknown>; summary?: string; }
export interface DocumentAnalysisService { analyzeDocument(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult>; }
/** Application summarization now lives in `application-summary.ts` with a structured, provider-pure contract. */

export const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "FLAGGED", "FAILED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Persisted verification record. It does not imply an AI provider or processing workflow. */
export interface DocumentVerification {
  id: string;
  applicationDocumentId: string;
  status: VerificationStatus;
  extractedData: Record<string, unknown>;
  flags: unknown[];
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}
