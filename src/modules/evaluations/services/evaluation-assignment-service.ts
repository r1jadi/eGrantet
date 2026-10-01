import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMunicipalityAccess } from "@/lib/auth/server";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { createNotification } from "@/modules/notifications/services/notification-service";
import { evaluationAssignInputSchema, evaluationRevokeInputSchema } from "../schemas";

const detailSchema = z.uuid();

export interface MunicipalityEvaluationSummary {
  applicationId: string;
  grantTitle: string;
  applicantName: string | null;
  applicantOrganisation: string | null;
  status: string;
  submittedAt: string | null;
  evaluations: Array<{
    evaluatorId: string;
    evaluatorName: string | null;
    evaluatorEmail: string | null;
    status: "DRAFT" | "SUBMITTED";
    score: number | null;
    updatedAt: string | null;
  }>;
  assignments: Array<{ evaluatorId: string; evaluatorName: string | null; assignedAt: string }>;
}

function evaluatorLabel(name: string | null, email: string | null): string {
  return name ?? email ?? "Evaluator";
}

/**
 * Loads everything the municipality needs to manage evaluation for an
 * application: assignments, evaluation progress and totals. Municipal
 * ownership is enforced via requireMunicipalityAccess before any read.
 */
export async function getMunicipalityEvaluationSummary(applicationId: string): Promise<MunicipalityEvaluationSummary> {
  const id = detailSchema.parse(applicationId);
  const admin = createSupabaseAdminClient();
  const { data: application, error } = await admin
    .from("applications")
    .select("id, status, submitted_at, grants!inner(municipality_id, title), users!applications_applicant_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the application.", error);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  const grant = application.grants as unknown as { municipality_id: string; title: string };
  const applicant = application.users as unknown as { full_name: string | null } | null;
  await requireMunicipalityAccess(grant.municipality_id);

  const [assignmentsResult, evaluationsResult] = await Promise.all([
    admin.from("evaluation_assignments").select("evaluator_id, assigned_at, users!evaluation_assignments_evaluator_id_fkey(full_name)").eq("application_id", id),
    admin.from("evaluations").select("evaluator_id, score, status, updated_at").eq("application_id", id),
  ]);
  if (assignmentsResult.error) throw new AppError("DATABASE", "Unable to load assignments.", assignmentsResult.error);
  if (evaluationsResult.error) throw new AppError("DATABASE", "Unable to load evaluations.", evaluationsResult.error);

  const evaluationByEvaluator = new Map(
    (evaluationsResult.data ?? []).map((evaluation) => [evaluation.evaluator_id as string, evaluation]),
  );

  const assignments = (assignmentsResult.data ?? []).map((assignment) => {
    const profile = assignment.users as unknown as { full_name: string | null } | null;
    return {
      evaluatorId: assignment.evaluator_id as string,
      evaluatorName: evaluatorLabel(profile?.full_name ?? null, null),
      assignedAt: assignment.assigned_at as string,
    };
  });

  // Evaluator contact emails come from the users table (id visible via FK).
  const evaluatorIds = (assignmentsResult.data ?? []).map((assignment) => assignment.evaluator_id as string);
  const { data: evaluatorProfiles } = evaluatorIds.length
    ? await admin.from("users").select("id, full_name").in("id", evaluatorIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> | null };

  const evaluations = (evaluationsResult.data ?? []).map((evaluation) => ({
    evaluatorId: evaluation.evaluator_id as string,
    evaluatorName: evaluatorLabel(
      (evaluatorProfiles ?? []).find((profile) => profile.id === evaluation.evaluator_id)?.full_name ?? null,
      null,
    ),
    evaluatorEmail: null,
    status: evaluation.status as "DRAFT" | "SUBMITTED",
    score: evaluation.score === null || evaluation.score === undefined ? null : Number(evaluation.score),
    updatedAt: (evaluation.updated_at as string) ?? null,
  }));

  return {
    applicationId: id,
    grantTitle: grant.title,
    applicantName: applicant?.full_name ?? null,
    applicantOrganisation: null,
    status: application.status as string,
    submittedAt: (application.submitted_at as string | null) ?? null,
    evaluations,
    assignments,
  };
}

/** Assigns an existing EVALUATOR profile (by email) to an application. */
export async function assignEvaluatorToApplication(input: unknown) {
  const data = evaluationAssignInputSchema.parse(input);
  const admin = createSupabaseAdminClient();

  const { data: application, error } = await admin
    .from("applications")
    .select("id, grants!inner(municipality_id)")
    .eq("id", data.applicationId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the application.", error);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  const actor = await requireMunicipalityAccess((application.grants as unknown as { municipality_id: string }).municipality_id);

  // Email lives in auth.users; resolve the evaluator through the admin API.
  const evaluatorId = await findEvaluatorIdByEmail(data.evaluatorEmail);
  if (!evaluatorId) throw new AppError("VALIDATION", "No evaluator account exists for that email.");

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, role, full_name")
    .eq("id", evaluatorId)
    .maybeSingle();
  if (profileError) throw new AppError("DATABASE", "Unable to verify the evaluator profile.", profileError);
  if (!profile) throw new AppError("VALIDATION", "No evaluator account exists for that email.");
  if (profile.role !== "EVALUATOR" && profile.role !== "ADMIN") {
    throw new AppError("VALIDATION", "That account is not an evaluator.");
  }

  const { error: insertError } = await admin
    .from("evaluation_assignments")
    .upsert(
      { application_id: data.applicationId, evaluator_id: evaluatorId, blind: data.blind },
      { onConflict: "application_id,evaluator_id" },
    );
  if (insertError) throw new AppError("DATABASE", "Unable to assign the evaluator.", insertError);

  await recordAuditEvent({
    actorId: actor.id,
    action: "EVALUATION_ASSIGNED",
    entityType: "application",
    entityId: data.applicationId,
    metadata: { evaluatorId, blind: data.blind },
  });
  // Assignment email rides the same domain event (preference-gated).
  try {
    const { notifyUser, evaluatorApplicationUrl } = await import("@/modules/notifications/services/email-notification-service");
    const { applicationReference } = await import("@/lib/i18n").then(() => ({ applicationReference: data.applicationId.slice(0, 8).toUpperCase() }));
    await notifyUser({
      userId: evaluatorId,
      applicationId: data.applicationId,
      category: "evaluation_updates",
      inApp: { type: "EVALUATION", title: "Evaluation assigned", message: "An application was assigned to you for evaluation." },
      email: {
        templateKind: "evaluation",
        eventKey: `evaluation:${data.applicationId}:assigned:${evaluatorId}`,
        variables: { applicationReference, evaluationUrl: evaluatorApplicationUrl(data.applicationId) },
      },
    });
  } catch {
    // best-effort
  }
  await createNotification({
    userId: evaluatorId,
    applicationId: data.applicationId,
    type: "SYSTEM",
    title: "New evaluation assigned",
    message: "You have been assigned to evaluate an application.",
  });
  return { assigned: true, evaluatorId };
}

/** Removes an evaluator's assignment (their evaluation row remains for transparency). */
export async function revokeEvaluatorAssignment(input: unknown) {
  const data = evaluationRevokeInputSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const { data: application, error } = await admin
    .from("applications")
    .select("id, grants!inner(municipality_id)")
    .eq("id", data.applicationId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the application.", error);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  const actor = await requireMunicipalityAccess((application.grants as unknown as { municipality_id: string }).municipality_id);
  const { error: deleteError } = await admin
    .from("evaluation_assignments")
    .delete()
    .eq("application_id", data.applicationId)
    .eq("evaluator_id", data.evaluatorId);
  if (deleteError) throw new AppError("DATABASE", "Unable to remove the assignment.", deleteError);
  await recordAuditEvent({
    actorId: actor.id,
    action: "EVALUATION_ASSIGNMENT_REVOKED",
    entityType: "application",
    entityId: data.applicationId,
    metadata: { evaluatorId: data.evaluatorId },
  });
  return { revoked: true };
}

/** Resolves an auth user id by email (evaluator accounts only, small dataset). */
async function findEvaluatorIdByEmail(email: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error) throw new AppError("DATABASE", "Unable to look up evaluators.", error);
  const match = (data?.users ?? []).find((user) => (user.email ?? "").toLowerCase() === email);
  return match?.id ?? null;
}
