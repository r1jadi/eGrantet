import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { requireRole } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { blindDocumentName, calculateTotalScore, isStaleEvaluation, redactAnswersForBlindPhase, resolveStoredTotal, validateEvaluationScores, type ScoringCriterion } from "@/modules/evaluations/scoring";
import { evaluationsColumnsAvailable } from "@/modules/evaluations/services/evaluation-service";
import { listActiveScoringCriteria } from "@/modules/evaluations/services/evaluation-service";
import { evaluationSaveInputSchema } from "@/modules/evaluations/schemas";
import type { ApplicationStatus } from "../types";

/** Columns that exist only after migration 20260926100000 (transparent evaluation). */
function isMissingRelationError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  return code === "PGRST205" || (typeof message === "string" && message.includes("'public.evaluation_assignments'"));
}

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  return code === "PGRST204" || code === "42703" || (typeof message === "string" && message.includes("blind"));
}

export interface EvaluatorAssignmentItem {
  applicationId: string;
  assignedAt: string;
  blind: boolean;
  application: {
    id: string;
    status: ApplicationStatus;
    submittedAt: string | null;
    grantTitle: string;
    fundingAmount: number | null;
    fundingCurrency: string | null;
  };
  evaluation: {
    status: "DRAFT" | "SUBMITTED" | null;
    score: number | null;
    updatedAt: string | null;
  };
}

/** Lists the evaluator's assigned applications with grant context and own evaluation progress. */
export async function listAssignedApplications(): Promise<EvaluatorAssignmentItem[]> {
  const user = await requireRole("EVALUATOR", "ADMIN");
  const admin = createSupabaseAdminClient();

  const assignmentsResult = await admin
    .from("evaluation_assignments")
    .select("application_id, evaluator_id, assigned_at, blind, applications!inner(id, status, submitted_at, grants!inner(title, funding_amount, funding_currency))")
    .eq("evaluator_id", user.id)
    .order("assigned_at", { ascending: false });
  if (assignmentsResult.error && !isMissingColumnError(assignmentsResult.error)) {
    throw new AppError("DATABASE", "Unable to load your assignments.", assignmentsResult.error);
  }

  let rows = (assignmentsResult.data ?? []) as Array<Record<string, unknown>>;
  let blindByDefault = false;
  if (assignmentsResult.error) {
    // Migration 20260926100000 not applied: read without the blind column.
    const fallback = await admin
      .from("evaluation_assignments")
      .select("application_id, evaluator_id, assigned_at, applications!inner(id, status, submitted_at, grants!inner(title, funding_amount, funding_currency))")
      .eq("evaluator_id", user.id)
      .order("assigned_at", { ascending: false });
    if (fallback.error) throw new AppError("DATABASE", "Unable to load your assignments.", fallback.error);
    rows = (fallback.data ?? []) as Array<Record<string, unknown>>;
    blindByDefault = true;
  }

  const applicationIds = rows.map((row) => row.application_id as string);
  let evaluations = applicationIds.length
    ? await admin.from("evaluations").select("id, application_id, score, status, updated_at, criterion_scores").eq("evaluator_id", user.id).in("application_id", applicationIds)
    : { data: [] as Array<Record<string, unknown>>, error: null };
  if (evaluations.error && isMissingColumnError(evaluations.error)) {
    // Migration 20260926100000 not applied: legacy evaluations lack criterion_scores.
    evaluations = applicationIds.length
      ? await admin.from("evaluations").select("id, application_id, score, status, updated_at").eq("evaluator_id", user.id).in("application_id", applicationIds)
      : { data: [] as Array<Record<string, unknown>>, error: null };
  }
  if (evaluations.error) throw new AppError("DATABASE", "Unable to load your evaluations.", evaluations.error);
  const evaluationByApplication = new Map((evaluations.data ?? []).map((evaluation) => [evaluation.application_id as string, evaluation]));

  return rows.map((row) => {
    const application = row.applications as unknown as {
      id: string;
      status: ApplicationStatus;
      submitted_at: string | null;
      grants: { title: string; funding_amount: number | null; funding_currency: string | null };
    };
    const evaluation = evaluationByApplication.get(row.application_id as string) as
      | { score: number | string | null; status: "DRAFT" | "SUBMITTED"; updated_at: string }
      | undefined;
    return {
      applicationId: row.application_id as string,
      assignedAt: row.assigned_at as string,
      blind: blindByDefault ? true : (row.blind as boolean | undefined) ?? true,
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submitted_at,
        grantTitle: application.grants.title,
        fundingAmount: application.grants.funding_amount === null ? null : Number(application.grants.funding_amount),
        fundingCurrency: application.grants.funding_currency,
      },
      evaluation: {
        status: evaluation?.status ?? null,
        score: evaluation?.score === null || evaluation?.score === undefined ? null : Number(evaluation.score),
        updatedAt: evaluation?.updated_at ?? null,
      },
    };
  });
}

/** Loads the evaluator's own evaluation for an application, if any. */
export async function getEvaluatorEvaluation(applicationId: string) {
  const user = await requireRole("EVALUATOR", "ADMIN");
  const admin = createSupabaseAdminClient();
  let result = await admin
    .from("evaluations")
    .select("id, application_id, evaluator_id, score, comment, status, criterion_scores, created_at, updated_at")
    .eq("application_id", applicationId)
    .eq("evaluator_id", user.id)
    .maybeSingle();
  if (result.error && isMissingColumnError(result.error)) {
    // Migration 20260926100000 not applied: legacy evaluations lack criterion_scores.
    result = await admin
      .from("evaluations")
      .select("id, application_id, evaluator_id, score, comment, status, created_at, updated_at")
      .eq("application_id", applicationId)
      .eq("evaluator_id", user.id)
      .maybeSingle();
  }
  if (result.error && !isMissingColumnError(result.error)) throw new AppError("DATABASE", "Unable to load your evaluation.", result.error);
  const data = result.data as Record<string, unknown> | null;
  if (!data) return null;
  return {
    id: data.id as string,
    status: data.status as "DRAFT" | "SUBMITTED",
    score: data.score === null || data.score === undefined ? null : Number(data.score),
    comment: (data.comment as string | null) ?? "",
    criterionScores: (data.criterion_scores ?? {}) as Record<string, number>,
    updatedAt: data.updated_at as string,
  };
}

/**
 * The blind application view for an assigned evaluator: project data required
 * for technical evaluation with applicant identity removed. Access outside
 * the evaluator's own assignments is refused server-side.
 */
export async function getBlindApplicationForEvaluator(applicationId: string) {
  const user = await requireRole("EVALUATOR", "ADMIN");
  const admin = createSupabaseAdminClient();

  let assignmentResult = await admin
    .from("evaluation_assignments")
    .select("application_id, evaluator_id, assigned_at, blind")
    .eq("application_id", applicationId)
    .eq("evaluator_id", user.id)
    .maybeSingle();
  if (assignmentResult.error && isMissingColumnError(assignmentResult.error)) {
    // Migration 20260926100000 not applied: legacy assignments are blind by default.
    assignmentResult = await admin
      .from("evaluation_assignments")
      .select("application_id, evaluator_id, assigned_at")
      .eq("application_id", applicationId)
      .eq("evaluator_id", user.id)
      .maybeSingle();
  }
  if (assignmentResult.error) throw new AppError("DATABASE", "Unable to verify your assignment.", assignmentResult.error);
  const assignment = assignmentResult.data as Record<string, unknown> | null;
  if (!assignment) throw new AppError("AUTHORIZATION", "You are not assigned to this application.");

  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, grant_id, status, submitted_at, answers, grants!inner(id, title, description, status, funding_amount, funding_currency, application_deadline)")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) throw new AppError("DATABASE", "Unable to load the application.", applicationError);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");

  const blind = (assignment as { blind?: boolean }).blind ?? true;
  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const grant = application.grants as unknown as {
    id: string;
    title: string;
    description: string;
    status: string;
    funding_amount: number | null;
    funding_currency: string | null;
    application_deadline: string | null;
  };

  const { data: documents, error: documentsError } = await admin
    .from("application_documents")
    .select("id, file_name, content_type, file_size_bytes, created_at")
    .eq("application_id", applicationId);
  if (documentsError) throw new AppError("DATABASE", "Unable to load application documents.", documentsError);

  return {
    applicationId: application.id as string,
    status: application.status as ApplicationStatus,
    submittedAt: application.submitted_at as string | null,
    grant: {
      id: grant.id,
      title: grant.title,
      description: grant.description,
      status: grant.status,
      fundingAmount: grant.funding_amount === null ? null : Number(grant.funding_amount),
      fundingCurrency: grant.funding_currency,
      applicationDeadline: grant.application_deadline,
    },
    answers: redactAnswersForBlindPhase(answers),
    documents: (documents ?? []).map((document: Record<string, unknown>, index: number) => ({
      id: document.id as string,
      displayName: blind
        ? blindDocumentName(index, String(document.file_name ?? "").split(".").pop() ?? "")
        : String(document.file_name ?? ""),
      contentType: String(document.content_type ?? "application/octet-stream"),
      fileSizeBytes: Number(document.file_size_bytes ?? 0),
      createdAt: String(document.created_at ?? ""),
    })),
    blind,
  };
}

/**
 * Saves (and optionally submits) the evaluator's per-criterion scores and
 * comment. Automatic criteria are scored server-side from trusted answers;
 * manual scores are validated against criterion limits; the total is computed
 * deterministically and every score/comment change is audited.
 */
export async function saveEvaluatorEvaluation(input: unknown) {
  const data = evaluationSaveInputSchema.parse(input);
  const user = await requireRole("EVALUATOR", "ADMIN");
  const admin = createSupabaseAdminClient();

  // The assignment check is the authorization boundary.
  const { data: assignment, error: assignmentError } = await admin
    .from("evaluation_assignments")
    .select("application_id")
    .eq("application_id", data.applicationId)
    .eq("evaluator_id", user.id)
    .maybeSingle();
  if (assignmentError) throw new AppError("DATABASE", "Unable to verify your assignment.", assignmentError);
  if (!assignment) throw new AppError("AUTHORIZATION", "You are not assigned to this application.");

  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, grant_id, answers")
    .eq("id", data.applicationId)
    .maybeSingle();
  if (applicationError) throw new AppError("DATABASE", "Unable to load the application.", applicationError);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");

  let evaluationResult = await admin
    .from("evaluations")
    .select("id, status, updated_at, comment, criterion_scores")
    .eq("application_id", data.applicationId)
    .eq("evaluator_id", user.id)
    .maybeSingle();
  if (evaluationResult.error && isMissingColumnError(evaluationResult.error)) {
    // Migration 20260926100000 not applied: legacy evaluations lack criterion_scores.
    evaluationResult = await admin
      .from("evaluations")
      .select("id, status, updated_at, comment")
      .eq("application_id", data.applicationId)
      .eq("evaluator_id", user.id)
      .maybeSingle();
  }
  if (evaluationResult.error && !isMissingColumnError(evaluationResult.error)) throw new AppError("DATABASE", "Unable to load your evaluation.", evaluationResult.error);
  const existing = (evaluationResult.data ?? null) as {
    id: string;
    status: "DRAFT" | "SUBMITTED";
    updated_at: string;
    comment: string | null;
    criterion_scores: Record<string, number> | null;
  } | null;

  if (existing?.status === "SUBMITTED") {
    throw new AppError("CONFLICT", "This evaluation was already submitted.");
  }
  if (existing && data.expectedUpdatedAt && isStaleEvaluation(existing.updated_at, data.expectedUpdatedAt)) {
    throw new AppError("CONFLICT", "This evaluation changed while you were editing. Reload and try again.");
  }

  const criteria: ScoringCriterion[] = await listActiveScoringCriteria(application.grant_id as string);
  const validation = validateEvaluationScores(criteria, data.scores, (application.answers ?? {}) as Record<string, unknown>);
  if (validation.errors.length) throw new AppError("VALIDATION", validation.errors.join(" "));
  if (data.submit && !validation.complete) {
    throw new AppError("VALIDATION", "Score every criterion before submitting.");
  }

  const total = calculateTotalScore(validation.scores);
  const storedTotal = resolveStoredTotal(total, validation.complete);
  const payload: Record<string, unknown> = {
    application_id: data.applicationId,
    evaluator_id: user.id,
    score: storedTotal,
    comment: data.comment || null,
    status: data.submit ? "SUBMITTED" : "DRAFT",
  };
  if (await evaluationsColumnsAvailable()) payload.criterion_scores = validation.scores;

  const response = existing
    ? await admin.from("evaluations").update(payload).eq("id", existing.id).select("id, updated_at").single()
    : await admin.from("evaluations").insert(payload).select("id, updated_at").single();
  if (response.error) throw new AppError("DATABASE", data.submit ? "Unable to submit your evaluation." : "Unable to save your evaluation.", response.error);

  const previousScores = existing?.criterion_scores ?? {};
  const previousComment = existing?.comment ?? null;
  const newComment = data.comment || null;
  const changedCriteria = Object.entries(validation.scores).filter(([criterionId, newValue]) => (previousScores[criterionId] ?? null) !== newValue);

  const auditEntries: Array<Promise<void>> = [];
  for (const [criterionId, newValue] of changedCriteria) {
    auditEntries.push(recordAuditEvent({
      actorId: user.id,
      action: data.submit ? "EVALUATION_SUBMITTED" : "EVALUATION_SCORE_UPDATED",
      entityType: "evaluation",
      entityId: response.data.id,
      metadata: {
        applicationId: data.applicationId,
        criterionId,
        previousScore: previousScores[criterionId] ?? null,
        newScore: newValue,
        submitted: data.submit,
      },
    }));
  }
  if (previousComment !== newComment) {
    auditEntries.push(recordAuditEvent({
      actorId: user.id,
      action: "EVALUATION_COMMENT_UPDATED",
      entityType: "evaluation",
      entityId: response.data.id,
      metadata: { applicationId: data.applicationId, hasComment: Boolean(newComment) },
    }));
  }
  await Promise.all(auditEntries);
  if (data.submit) {
    await recordAuditEvent({
      actorId: user.id,
      action: "EVALUATION_SUBMITTED",
      entityType: "evaluation",
      entityId: response.data.id,
      metadata: { applicationId: data.applicationId, totalScore: storedTotal },
    });
  }

  return {
    evaluationId: response.data.id as string,
    status: data.submit ? ("SUBMITTED" as const) : ("DRAFT" as const),
    totalScore: storedTotal,
    complete: validation.complete,
    warnings: validation.warnings,
    updatedAt: response.data.updated_at as string,
  };
}
