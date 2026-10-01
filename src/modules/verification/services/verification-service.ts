import "server-only";
import { randomUUID } from "node:crypto";
import { requireAuth, requireMunicipalityAccess } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { extractDocumentContent } from "@/modules/documents/services/document-content";
import { OpenAIDocumentAnalysisService } from "@/modules/ai/openai-document-analysis";
import { OpenAIVerificationSynthesisService } from "@/modules/ai/openai-verification-synthesis";
import { toAiServiceError } from "@/lib/openai/config";
import type { DocumentAnalysisResult } from "@/modules/ai/document-analysis";
import type { SynthesisResult } from "@/modules/ai/verification-synthesis";
import { compareApplicationWithDocument, collectInconsistencies } from "../consistency";
import { detectMissingDocuments } from "../missing-documents";
import {
  evaluateRequirementDeterministically,
  evaluateDocumentRequirement,
  evaluateRequirementWithDocumentEvidence,
  type RequirementVerification,
  type VerificationStatus,
} from "../requirement-evaluation";

const documentAnalyzer = new OpenAIDocumentAnalysisService();
const synthesizer = new OpenAIVerificationSynthesisService();

interface VerificationRow {
  application_id: string;
  grant_id: string;
  applicant_id: string;
  status: string;
  submitted_at: string | null;
  answers: Record<string, unknown>;
  grants: { title: string; funding_amount: number | null; funding_currency: string | null; municipality_id: string } | null;
}

async function loadApplicationForVerification(applicationId: string): Promise<VerificationRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("applications")
    .select("application_id: id, grant_id, applicant_id, status, submitted_at, answers, grants(title, funding_amount, funding_currency, municipality_id)")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the application.", error);
  if (!data) throw new AppError("NOT_FOUND", "Application not found.");
  return data as unknown as VerificationRow;
}

/** Authorization: only municipality staff of the owning grant (or platform admins via requireMunicipalityAccess) may verify. */
async function authorizeVerification(applicationId: string): Promise<{ actorId: string; application: VerificationRow }> {
  const user = await requireAuth();
  const application = await loadApplicationForVerification(applicationId);
  if (application.status === "DRAFT") throw new AppError("VALIDATION", "Verification is available after the application is submitted.");
  const grant = application.grants;
  if (!grant) throw new AppError("NOT_FOUND", "Application grant not found.");
  const actor = await requireMunicipalityAccess(grant.municipality_id);
  return { actorId: actor.id, application };
}

async function loadRequirements(grantId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("grant_requirements")
    .select("id, name, type, is_required, configuration")
    .eq("grant_id", grantId)
    .order("display_order", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load grant requirements.", error);
  return data ?? [];
}

async function loadDocumentsWithAnalyses(applicationId: string) {
  const admin = createSupabaseAdminClient();
  const { data: documents, error } = await admin
    .from("application_documents")
    .select("id, requirement_id, document_type, file_name, storage_path, content_type, status, document_verifications(id, status, extracted_data, confidence, updated_at)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load application documents.", error);
  return (documents ?? []) as Array<{
    id: string;
    requirement_id: string | null;
    document_type: string | null;
    file_name: string;
    storage_path: string;
    content_type: string;
    status: string;
    document_verifications: Array<{ id: string; status: string; extracted_data: Record<string, unknown>; confidence: number | null; updated_at: string }> | null;
  }>;
}

/** Reads a cached analysis; returns null when missing, stale, or previously failed. */
function cachedAnalysis(document: Awaited<ReturnType<typeof loadDocumentsWithAnalyses>>[number]): DocumentAnalysisResult | null {
  const rows = document.document_verifications ?? [];
  if (rows.length === 0) return null;
  const latest = rows[rows.length - 1];
  const extracted = latest.extracted_data as { analysis?: DocumentAnalysisResult } | null;
  const analysis = extracted?.analysis;
  if (!analysis || !latest.status || latest.status === "PENDING" || latest.status === "FAILED") return null;
  return analysis;
}

async function persistDocumentAnalysis(applicationId: string, documentId: string, analysis: DocumentAnalysisResult | null, error?: unknown): Promise<void> {
  const admin = createSupabaseAdminClient();
  const payload: { application_document_id: string; status: "VERIFIED" | "FLAGGED" | "UNREADABLE" | "NEEDS_REVIEW"; extracted_data: Record<string, unknown>; flags: string[]; confidence: number | null } = analysis
    ? { application_document_id: documentId, status: analysis.status, extracted_data: { analysis }, flags: analysis.inconsistencies.map((item) => item.kind), confidence: analysis.confidence }
    : { application_document_id: documentId, status: "NEEDS_REVIEW", extracted_data: { error: error instanceof Error ? error.message.slice(0, 300) : "analysis failed" }, flags: ["NEEDS_REVIEW"], confidence: null };
  const { error: insertError } = await admin.from("document_verifications").insert(payload);
  if (insertError) logger.error("verification_document_persist_failed", { documentId });
  await recordAuditEvent({
    action: analysis ? "DOCUMENT_ANALYSIS_COMPLETED" : "DOCUMENT_ANALYSIS_FAILED",
    entityType: "application_document",
    entityId: documentId,
    metadata: { applicationId, status: analysis?.status ?? "NEEDS_REVIEW" },
  });
}

async function persistRequirementVerifications(applicationId: string, runId: string, verifications: RequirementVerification[]): Promise<void> {
  const admin = createSupabaseAdminClient();
  for (const verification of verifications) {
    const row = {
      application_id: applicationId,
      requirement_id: verification.requirementId,
      result: verification.result,
      source: verification.source,
      status: verification.status,
      evidence: verification.evidence,
      explanation: verification.explanation,
      confidence: verification.confidence,
      run_id: runId,
    };
    const { error } = await admin
      .from("requirement_verifications")
      .upsert(row, { onConflict: "application_id,requirement_id" });
    if (error) logger.error("verification_requirement_persist_failed", { applicationId, requirementId: verification.requirementId });
  }
}

async function persistVerificationOverview(input: {
  applicationId: string;
  runId: string;
  status: VerificationStatus;
  missingDocumentRequirementIds: string[];
  inconsistencies: Array<Record<string, unknown>>;
  summary: string | null;
  errorMessage: string | null;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("application_verifications")
    .upsert(
      {
        application_id: input.applicationId,
        status: input.status,
        run_id: input.runId,
        missing_document_requirement_ids: input.missingDocumentRequirementIds,
        inconsistencies: input.inconsistencies,
        summary: input.summary,
        error_message: input.errorMessage,
        started_at: input.status === "PROCESSING" ? new Date().toISOString() : undefined,
        completed_at: input.status === "PROCESSING" ? null : new Date().toISOString(),
      },
      { onConflict: "application_id" },
    );
  if (error) throw new AppError("DATABASE", "Unable to save the verification result.", error);
}

async function getStoredVerificationOverview(applicationId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("application_verifications")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the verification result.", error);
  return data as
    | { application_id: string; status: VerificationStatus; run_id: string | null; missing_document_requirement_ids: string[]; inconsistencies: Array<Record<string, unknown>>; summary: string | null; error_message: string | null; started_at: string | null; completed_at: string | null; updated_at: string }
    | null;
}

export type VerificationOverview = NonNullable<Awaited<ReturnType<typeof getStoredVerificationOverview>>>;

export interface RequirementVerificationRow {
  id: string;
  requirementId: string | null;
  requirementName: string;
  requirementType: string;
  isRequired: boolean;
  result: string;
  source: string;
  explanation: string | null;
  evidence: Array<{ source: string; quote: string; value: string }>;
  confidence: number | null;
}

export interface DocumentVerificationRow {
  id: string;
  fileName: string;
  documentType: string | null;
  status: string | null;
  confidence: number | null;
  notes: string | null;
  inconsistencies: string[];
}

/** Persisted per-requirement verification results for the reviewer UI. */
export async function listRequirementVerifications(applicationId: string): Promise<RequirementVerificationRow[]> {
  await authorizeVerificationRead(applicationId);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("requirement_verifications")
    .select("id, requirement_id, result, source, explanation, evidence, confidence, grant_requirements(name, type, is_required)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load the verification results.", error);
  return (data ?? []).map((row) => {
    const requirement = row.grant_requirements as unknown as { name: string; type: string; is_required: boolean } | null;
    return {
      id: String(row.id),
      requirementId: (row.requirement_id as string | null) ?? null,
      requirementName: requirement?.name ?? `Requirement ${String(row.requirement_id ?? "").slice(0, 8).toUpperCase()}`,
      requirementType: requirement?.type ?? "OTHER",
      isRequired: requirement?.is_required ?? true,
      result: String(row.result),
      source: String(row.source),
      explanation: (row.explanation as string | null) ?? null,
      evidence: Array.isArray(row.evidence) ? (row.evidence as RequirementVerificationRow["evidence"]) : [],
      confidence: (row.confidence as number | null) ?? null,
    };
  });
}

/** Per-document AI analysis status for the reviewer UI (latest row per document). */
export async function listDocumentVerificationStatuses(applicationId: string): Promise<DocumentVerificationRow[]> {
  await authorizeVerificationRead(applicationId);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("application_documents")
    .select("id, file_name, document_type, document_verifications(status, extracted_data, confidence, created_at)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load the document analyses.", error);
  return (data ?? []).map((row) => {
    const verifications = (row.document_verifications ?? []) as Array<{ status: string; extracted_data: Record<string, unknown> | null; confidence: number | null; created_at: string }>;
    const latest = verifications[verifications.length - 1];
    const extracted = (latest?.extracted_data ?? null) as { analysis?: { verificationNotes?: string; inconsistencies?: Array<{ description?: string }> } } | null;
    return {
      id: String(row.id),
      fileName: String(row.file_name),
      documentType: (row.document_type as string | null) ?? null,
      status: (latest?.status as string | undefined) ?? null,
      confidence: (latest?.confidence as number | null | undefined) ?? null,
      notes: extracted?.analysis?.verificationNotes ?? null,
      inconsistencies: (extracted?.analysis?.inconsistencies ?? []).map((item) => String(item.description ?? "")).filter(Boolean),
    };
  });
}

/** Read-side authorization: same boundary as the write path (municipality staff; applicants are redirected away by the page). */
async function authorizeVerificationRead(applicationId: string): Promise<void> {
  const user = await requireAuth();
  const application = await loadApplicationForVerification(applicationId);
  if (application.applicant_id === user.id) return;
  const grant = application.grants;
  if (!grant) throw new AppError("NOT_FOUND", "Application grant not found.");
  await requireMunicipalityAccess(grant.municipality_id);
}

/**
 * Runs the full verification workflow for one application.
 *
 * Stages: missing-document detection → per-document AI analysis (cached by
 * document) → deterministic-first requirement evaluation → consistency
 * checks → AI synthesis (findings + summary) → persistence → audit →
 * notification. Partial failures degrade to NEEDS_REVIEW, never to a blanket
 * failure.
 */
export async function runApplicationVerification(applicationId: string): Promise<{ status: VerificationStatus; runId: string }> {
  const { actorId, application } = await authorizeVerification(applicationId);
  const runId = randomUUID();
  const admin = createSupabaseAdminClient();

  await persistVerificationOverview({
    applicationId,
    runId,
    status: "PROCESSING",
    missingDocumentRequirementIds: [],
    inconsistencies: [],
    summary: null,
    errorMessage: null,
  });
  await recordAuditEvent({ actorId, action: "VERIFICATION_STARTED", entityType: "application", entityId: applicationId, metadata: { runId } });

  try {
    const [requirements, documents] = await Promise.all([loadRequirements(application.grant_id), loadDocumentsWithAnalyses(applicationId)]);

    // 1. Missing required documents (deterministic).
    const missing = detectMissingDocuments(
      requirements.map((requirement) => ({ id: requirement.id, name: requirement.name, type: requirement.type, isRequired: requirement.is_required })),
      documents.map((document) => ({ requirementId: document.requirement_id, status: document.status })),
    );

    // 2. Per-document AI analysis with caching (skip when a usable analysis exists).
    const analyses: Array<{ documentId: string; requirementId: string | null; fileName: string; status: string; extractedFields: Array<{ name: string; value: string; sourceQuote: string }>; raw: DocumentAnalysisResult | null }> = [];
    const answers = application.answers ?? {};
    for (const document of documents) {
      const reuse = cachedAnalysis(document);
      if (reuse) {
        analyses.push({ documentId: document.id, requirementId: document.requirement_id, fileName: document.file_name, status: reuse.status, extractedFields: reuse.extractedFields, raw: reuse });
        continue;
      }
      try {
        const content = await extractDocumentContent(document.id);
        let analysis: DocumentAnalysisResult;
        if (!content.isImage && !content.content) {
          analysis = {
            status: "UNREADABLE",
            documentType: "OTHER",
            confidence: 0,
            extractedFields: [],
            missingInformation: ["No readable text content could be extracted from this document."],
            inconsistencies: [],
            verificationNotes: "The document could not be read reliably and must be reviewed manually.",
          };
        } else {
          analysis = await documentAnalyzer.analyzeDocument({
            fileName: document.file_name,
            declaredType: document.document_type ?? document.file_name,
            mimeType: document.content_type,
            contentText: content.content,
            applicationFacts: Object.fromEntries(Object.entries(answers).filter(([, value]) => typeof value === "string")) as Record<string, string>,
          });
        }
        analyses.push({ documentId: document.id, requirementId: document.requirement_id, fileName: document.file_name, status: analysis.status, extractedFields: analysis.extractedFields, raw: analysis });
        await persistDocumentAnalysis(applicationId, document.id, analysis);
      } catch (error) {
        if (error instanceof AppError && error.code !== "AI") throw error;
        analyses.push({ documentId: document.id, requirementId: document.requirement_id, fileName: document.file_name, status: "NEEDS_REVIEW", extractedFields: [], raw: null });
        await persistDocumentAnalysis(applicationId, document.id, null, error);
      }
    }

    // 3. Requirement-by-requirement evaluation (deterministic first).
    const verifications: RequirementVerification[] = [];
    for (const requirement of requirements) {
      const context = {
        requirement: { id: requirement.id, name: requirement.name, type: requirement.type, isRequired: requirement.is_required, configuration: (requirement.configuration ?? {}) as Record<string, unknown> },
        answers,
        applicationDate: new Date(application.submitted_at ?? new Date().toISOString()),
        grantMaximumAmount: application.grants?.funding_amount ?? null,
        requestedAmount: typeof answers.budgetAmount === "string" ? Number(String(answers.budgetAmount).replace(/[^\d.-]/g, "")) || null : null,
        currency: application.grants?.funding_currency ?? null,
        documentAnalyses: analyses,
      };
      const deterministic = evaluateRequirementDeterministically(context);
      if (deterministic) {
        verifications.push(deterministic);
        continue;
      }
      if (requirement.type === "DOCUMENT") {
        verifications.push(evaluateDocumentRequirement(context));
        continue;
      }
      const config = requirement.configuration as { minimumYears?: number; expectedAnswer?: string; answerKey?: string };
      verifications.push(evaluateRequirementWithDocumentEvidence(context, config));
    }

    // 4. Cross-document consistency checks.
    const consistencyChecks = analyses.flatMap((analysis) =>
      analysis.raw ? compareApplicationWithDocument(answers, analysis.raw.extractedFields, analysis.fileName) : [],
    );
    const inconsistencies = collectInconsistencies(consistencyChecks);

    // 5. AI synthesis (findings + summary). Failure degrades gracefully.
    let summary: string | null = null;
    let synthesisFindings: SynthesisResult["findings"] = [];
    try {
      const synthesis = await synthesizer.synthesize({
        grantTitle: application.grants?.title ?? "Grant application",
        requestedAmount: application.grants?.funding_amount != null && application.grants?.funding_currency ? { amount: application.grants.funding_amount, currency: application.grants.funding_currency } : null,
        submittedAt: application.submitted_at,
        deterministicResults: verifications.map((verification) => ({ requirement: verification.requirementName, result: verification.result === "PASS" ? "PASSED" : verification.result === "FAIL" ? "FAILED" : "PENDING", explanation: verification.explanation })),
        documentResults: analyses.map((analysis) => ({ fileName: analysis.fileName, status: analysis.status, notes: analysis.raw?.verificationNotes ?? "", inconsistencies: analysis.raw?.inconsistencies.map((item) => item.description) ?? [] })),
        missingDocuments: missing.missingRequirementNames,
      });
      summary = synthesis.summary;
      synthesisFindings = synthesis.findings;
    } catch (error) {
      logger.warn("verification_synthesis_unavailable", { applicationId, message: error instanceof Error ? error.message.slice(0, 200) : "unknown" });
    }

    // 6. Lifecycle status: COMPLETED only when nothing needs attention.
    const hasBlockingFindings =
      missing.missingRequirementIds.length > 0 ||
      inconsistencies.length > 0 ||
      analyses.some((analysis) => analysis.status === "UNREADABLE" || analysis.status === "NEEDS_REVIEW") ||
      verifications.some((verification) => verification.result === "NEEDS_REVIEW" || verification.result === "NOT_VERIFIABLE");
    const status: VerificationStatus = hasBlockingFindings ? "NEEDS_REVIEW" : "COMPLETED";

    const allInconsistencies = [
      ...inconsistencies,
      ...synthesisFindings.filter((finding) => finding.severity !== "INFO").map((finding) => ({ field: "synthesis", applicationValue: null, documentValue: null, note: `${finding.severity}: ${finding.title} — ${finding.detail}` })),
    ];

    await persistVerificationOverview({
      applicationId,
      runId,
      status,
      missingDocumentRequirementIds: missing.missingRequirementIds,
      inconsistencies: allInconsistencies,
      summary,
      errorMessage: null,
    });
    await persistRequirementVerifications(applicationId, runId, verifications);

    await recordAuditEvent({
      actorId,
      action: "VERIFICATION_COMPLETED",
      entityType: "application",
      entityId: applicationId,
      metadata: { runId, status, documents: analyses.length, requirements: verifications.length, inconsistencies: allInconsistencies.length },
    });

    // Notification for the reviewer (municipality members) is implicit — the
    // review UI reads the verification directly. The applicant is not told
    // about internal verification, only about later human decisions.
    return { status, runId };
  } catch (error) {
    if (error instanceof AppError && error.code === "AI") {
      await persistVerificationOverview({
        applicationId,
        runId,
        status: "FAILED",
        missingDocumentRequirementIds: [],
        inconsistencies: [],
        summary: null,
        errorMessage: "AI analysis could not be completed. Please retry.",
      });
      await recordAuditEvent({ actorId, action: "VERIFICATION_FAILED", entityType: "application", entityId: applicationId, metadata: { runId } });
      throw toAiServiceError(error);
    }
    throw error;
  }
}

/** Reprocessing: invalidates cached document analyses so the next run re-analyzes. */
export async function invalidateDocumentAnalysis(documentId: string): Promise<void> {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();
  const { data: document, error } = await admin
    .from("application_documents")
    .select("id, application_id, applications!inner(applicant_id, grants!inner(municipality_id))")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the document.", error);
  if (!document) throw new AppError("NOT_FOUND", "Document not found.");
  const application = document.applications as unknown as { applicant_id: string; grants: { municipality_id: string } };
  if (application.applicant_id !== user.id) {
    await requireMunicipalityAccess(application.grants.municipality_id);
  }
  const { error: updateError } = await admin.from("document_verifications").update({ status: "PENDING" }).eq("application_document_id", documentId);
  if (updateError) throw new AppError("DATABASE", "Unable to invalidate the analysis.", updateError);
  await recordAuditEvent({ actorId: user.id, action: "DOCUMENT_ANALYSIS_INVALIDATED", entityType: "application_document", entityId: documentId, metadata: { applicationId: document.application_id } });
}

export { getStoredVerificationOverview as getVerificationOverview };
