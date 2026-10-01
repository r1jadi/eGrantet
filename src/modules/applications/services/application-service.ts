import "server-only";
import { getCurrentProfile, requireAuth, requireMunicipalityAccess } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { createNotification } from "@/modules/notifications/services/notification-service";
import { assertApplicationTransition, type ManagedApplicationStatus } from "../lifecycle";
import { applicationAnswersSchema } from "../schemas";
import { missingRequiredDocumentIds } from "@/modules/grants/grant-document-requirements";
import { ensureGranteeProjectCreated } from "@/modules/grantee/services/grantee-project-service";

const applicationSelect = "id, grant_id, applicant_id, status, submitted_at, answers, created_at, updated_at";

export async function listApplicationsForApplicant() {
  const user = await requireAuth();
  const { data, error } = await createSupabaseAdminClient()
    .from("applications")
    .select(`${applicationSelect}, grants(title, status, funding_amount, funding_currency, application_deadline)`)
    .eq("applicant_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new AppError("DATABASE", "Unable to load your applications.", error);
  return data;
}

async function loadApplication(applicationId: string) {
  const { data, error } = await createSupabaseAdminClient().from("applications").select(`${applicationSelect}, grants!inner(municipality_id, status, application_deadline)`).eq("id", applicationId).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load application.", error);
  if (!data) throw new AppError("NOT_FOUND", "Application not found.");
  return data;
}

export async function createDraftApplication(grantId: string) {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();
  const { data: grant, error } = await admin.from("grants").select("id, status, application_deadline").eq("id", grantId).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load grant.", error);
  if (!grant || grant.status !== "PUBLISHED") throw new AppError("NOT_FOUND", "This grant is not available.");
  if (grant.application_deadline && new Date(grant.application_deadline) <= new Date()) throw new AppError("VALIDATION", "The application deadline has passed.");
  const { data, error: insertError } = await admin.from("applications").insert({ grant_id: grantId, applicant_id: user.id, status: "DRAFT", answers: {} }).select(applicationSelect).single();
  if (insertError) {
    if (insertError.code === "23505") throw new AppError("CONFLICT", "You already have an application for this grant.");
    throw new AppError("DATABASE", "Unable to create application.", insertError);
  }
  await recordAuditEvent({ actorId: user.id, action: "APPLICATION_CREATED", entityType: "application", entityId: data.id });
  return data;
}

export async function getApplicationForCurrentUser(applicationId: string) {
  const user = await requireAuth();
  const application = await loadApplication(applicationId);
  if (application.applicant_id === user.id) return application;
  const profile = await getCurrentProfile();
  if (profile?.role === "EVALUATOR") {
    const { data: assignment, error } = await createSupabaseAdminClient().from("evaluation_assignments").select("application_id").eq("application_id", applicationId).eq("evaluator_id", user.id).maybeSingle();
    if (error) throw new AppError("DATABASE", "Unable to verify evaluator assignment.", error);
    if (assignment) return application;
    throw new AppError("AUTHORIZATION", "You are not assigned to this application.");
  }
  const grant = application.grants as unknown as { municipality_id: string };
  await requireMunicipalityAccess(grant.municipality_id);
  return application;
}

export async function updateDraftApplication(applicationId: string, answers: unknown) {
  const user = await requireAuth();
  const application = await loadApplication(applicationId);
  if (application.applicant_id !== user.id) throw new AppError("AUTHORIZATION", "You cannot edit this application.");
  if (application.status !== "DRAFT" && application.status !== "CORRECTION_REQUESTED") throw new AppError("CONFLICT", "This application is no longer editable.");
  const parsedAnswers = applicationAnswersSchema.parse(answers);
  const { data, error } = await createSupabaseAdminClient().from("applications").update({ answers: parsedAnswers }).eq("id", applicationId).select(applicationSelect).single();
  if (error) throw new AppError("DATABASE", "Unable to save application.", error);
  await recordAuditEvent({ actorId: user.id, action: "APPLICATION_UPDATED", entityType: "application", entityId: applicationId });
  return data;
}

export async function submitApplication(applicationId: string) {
  const user = await requireAuth();
  const application = await loadApplication(applicationId);
  if (application.applicant_id !== user.id) throw new AppError("AUTHORIZATION", "You cannot submit this application.");
  if (application.status !== "DRAFT" && application.status !== "CORRECTION_REQUESTED") throw new AppError("CONFLICT", "This application cannot be submitted.");
  const grant = application.grants as unknown as { status: string; application_deadline: string | null };
  if (grant.status !== "PUBLISHED") throw new AppError("VALIDATION", "This grant is no longer open for applications.");
  if (grant.application_deadline && new Date(grant.application_deadline) <= new Date()) throw new AppError("VALIDATION", "The application deadline has passed.");
  const admin = createSupabaseAdminClient();
  const { data: requirements, error: requirementsError } = await admin.from("grant_requirements").select("id, type, is_required, configuration").eq("grant_id", application.grant_id);
  if (requirementsError) throw new AppError("DATABASE", "Unable to validate application requirements.", requirementsError);
  const answers = application.answers as Record<string, unknown>;
  const missingAnswer = requirements.find((requirement) => requirement.type !== "DOCUMENT" && requirement.is_required && typeof (requirement.configuration as { answerKey?: unknown }).answerKey === "string" && !answers[(requirement.configuration as { answerKey: string }).answerKey]);
  if (missingAnswer) throw new AppError("VALIDATION", "Required application information is missing.");
  // Document gate: every DOCUMENT requirement marked required must have an
  // UPLOADED document attached to that exact requirement id (shared resolver,
  // pinned by grant-document-requirements tests). Optional documents never
  // block; a document on the wrong slot does not satisfy another.
  const documentRequirementIds = requirements.filter((requirement) => requirement.type === "DOCUMENT").map((requirement) => requirement.id);
  if (documentRequirementIds.length) {
    const { data: documents, error: documentsError } = await admin.from("application_documents").select("requirement_id").eq("application_id", applicationId).in("requirement_id", documentRequirementIds).eq("status", "UPLOADED");
    if (documentsError) throw new AppError("DATABASE", "Unable to validate application documents.", documentsError);
    const uploadedIds = new Set(documents.map((document) => document.requirement_id as string));
    const missingDocumentIds = missingRequiredDocumentIds(
      requirements.map((requirement) => ({ id: requirement.id, name: "", description: "", type: requirement.type, isRequired: requirement.is_required })),
      uploadedIds,
    );
    if (missingDocumentIds.length > 0) throw new AppError("VALIDATION", "Required documents are missing.");
  }
  const { data, error } = await admin.from("applications").update({ status: "SUBMITTED", submitted_at: new Date().toISOString() }).eq("id", applicationId).select(applicationSelect).single();
  if (error) throw new AppError("DATABASE", "Unable to submit application.", error);
  await recordAuditEvent({ actorId: user.id, action: "APPLICATION_SUBMITTED", entityType: "application", entityId: applicationId });
  await createNotification({ userId: user.id, applicationId, type: "APPLICATION_STATUS", title: "Application submitted", message: "Your application was submitted successfully." });
  // Deterministic eligibility runs server-side at submission so reviewers see
  // the objective pre-check immediately; a failure must not roll back the
  // submission itself, so errors are logged and surfaced through the missing
  // checks (PENDING) in the review UI.
  const { runEligibilityChecks } = await import("@/modules/eligibility/services/eligibility-service");
  try {
    await runEligibilityChecks(applicationId);
  } catch (eligibilityError) {
    const { logger } = await import("@/lib/logging/logger");
    logger.warn("eligibility_check_deferred", { applicationId, message: eligibilityError instanceof Error ? eligibilityError.message.slice(0, 200) : "unknown" });
  }
  return data;
}

export async function updateMunicipalApplicationStatus(applicationId: string, to: ManagedApplicationStatus, message?: string) {
  const application = await loadApplication(applicationId);
  const grant = application.grants as unknown as { municipality_id: string };
  const actor = await requireMunicipalityAccess(grant.municipality_id);
  assertApplicationTransition(application.status as ManagedApplicationStatus, to);
  const changes = to === "SUBMITTED" ? { status: to, submitted_at: new Date().toISOString() } : { status: to };
  const { data, error } = await createSupabaseAdminClient().from("applications").update(changes).eq("id", applicationId).select(applicationSelect).single();
  if (error) throw new AppError("DATABASE", "Unable to update application status.", error);
  await recordAuditEvent({ actorId: actor.id, action: "APPLICATION_STATUS_CHANGED", entityType: "application", entityId: applicationId, metadata: { from: application.status, to } });
  await createNotification({ userId: application.applicant_id, applicationId, type: to === "CORRECTION_REQUESTED" ? "CORRECTION_REQUEST" : "APPLICATION_STATUS", title: "Application status updated", message: message ?? `Your application status is now ${to}.` });
  // Email follows the same domain event: status updates are gated by the
  // application_updates preference; APPROVED/REJECTED are transactional
  // decision notifications (always delivered). Failures never block the flow.
  try {
    const { notifyUser, applicationUrl } = await import("@/modules/notifications/services/email-notification-service");
    const isDecision = to === "APPROVED" || to === "REJECTED";
    await notifyUser({
      userId: application.applicant_id,
      applicationId,
      category: isDecision ? "decision_notifications" : "application_updates",
      inApp: { type: "APPLICATION_STATUS", title: "Application status updated", message: message ?? `Your application status is now ${to}.` },
      email: {
        templateKind: isDecision ? "decision" : "application_status",
        eventKey: `application:${applicationId}:status:${to}`,
        variables: { status: to, applicationUrl: applicationUrl(applicationId), applicationReference: applicationId.slice(0, 8).toUpperCase() },
      },
    });
  } catch (emailError) {
    const { logger } = await import("@/lib/logging/logger");
    logger.warn("application_status_email_failed", { applicationId, message: emailError instanceof Error ? emailError.message.slice(0, 200) : "unknown" });
  }
  if (to === "APPROVED") {
    // Post-award: provision the grantee milestone portal (idempotent, non-blocking on failure).
    await ensureGranteeProjectCreated(applicationId);
  }
  return data;
}
