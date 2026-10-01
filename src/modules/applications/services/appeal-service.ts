import "server-only";

import { requireAuth, requireMunicipalityAccess } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { createNotification } from "@/modules/notifications/services/notification-service";
import { z } from "zod";

/**
 * Appeals workflow.
 *
 * An applicant whose application was REJECTED may file one appeal within
 * APPEAL_WINDOW_DAYS of the decision. The municipality reviews it
 * (UNDER_REVIEW) and records the final decision (DECISION_MADE), which
 * notifies the applicant. Every transition is audited.
 */

export const APPEAL_WINDOW_DAYS = 8;

export type AppealStatus = "SUBMITTED" | "UNDER_REVIEW" | "DECISION_MADE";

const APPEAL_TRANSITIONS: Record<AppealStatus, AppealStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["DECISION_MADE"],
  DECISION_MADE: [],
};

function assertAppealTransition(from: AppealStatus, to: AppealStatus): void {
  if (!APPEAL_TRANSITIONS[from].includes(to)) {
    throw new AppError("CONFLICT", `An appeal cannot move from ${from} to ${to}.`);
  }
}

const submitAppealSchema = z.object({
  applicationId: z.string().uuid(),
  reason: z.string().trim().min(1, "Enter the reason for your appeal.").max(200),
  explanation: z.string().trim().min(1, "Explain why you are appealing.").max(4_000),
});

export interface AppealView {
  id: string;
  applicationId: string;
  status: AppealStatus;
  reason: string;
  explanation: string;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

function toView(row: Record<string, unknown>): AppealView {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    status: row.status as AppealStatus,
    reason: String(row.reason),
    explanation: String(row.explanation),
    decisionNote: (row.decision_note as string | null) ?? null,
    decidedAt: (row.decided_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

/** Submits the appeal for one rejected application (owner only, window enforced). */
export async function submitAppeal(input: unknown): Promise<AppealView> {
  const data = submitAppealSchema.parse(input);
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();

  const { data: application, error } = await admin
    .from("applications")
    .select("id, applicant_id, status, updated_at, grants!inner(title, municipality_id)")
    .eq("id", data.applicationId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the application.", error);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  if (application.applicant_id !== user.id) throw new AppError("AUTHORIZATION", "You cannot appeal this application.");
  if (application.status !== "REJECTED") throw new AppError("VALIDATION", "Only rejected applications can be appealed.");

  // The appeal window is anchored on the decision (status-change) date.
  const decidedAt = new Date(application.updated_at as string);
  const deadline = new Date(decidedAt);
  deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
  if (Date.now() > deadline.getTime()) {
    throw new AppError("VALIDATION", "The appeal window for this decision has closed.");
  }

  const { data: appeal, error: insertError } = await admin
    .from("appeals")
    .insert({ application_id: data.applicationId, applicant_id: user.id, reason: data.reason, explanation: data.explanation })
    .select("id, application_id, status, reason, explanation, decision_note, decided_at, created_at")
    .single();
  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      throw new AppError("CONFLICT", "An appeal has already been submitted for this application.");
    }
    throw new AppError("DATABASE", "Unable to submit the appeal.", insertError);
  }

  await recordAuditEvent({ actorId: user.id, action: "APPEAL_SUBMITTED", entityType: "appeal", entityId: String(appeal.id), metadata: { applicationId: data.applicationId } });

  // Notify the municipality's reviewing staff through the standard channel.
  const grant = application.grants as unknown as { title: string };
  await createNotification({
    userId: user.id,
    applicationId: data.applicationId,
    type: "APPLICATION_STATUS",
    title: "Appeal submitted",
    message: `Your appeal for “${grant.title}” was received and will be reviewed by an independent grants officer.`,
  });

  return toView(appeal as Record<string, unknown>);
}

/** Loads the appeal for one application for its owner (or null when none). */
export async function getAppealForCurrentUser(applicationId: string): Promise<AppealView | null> {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("appeals")
    .select("id, application_id, status, reason, explanation, decision_note, decided_at, created_at")
    .eq("application_id", applicationId)
    .eq("applicant_id", user.id)
    .maybeSingle();
  if (error && (error as { code?: string }).code !== "PGRST116") throw new AppError("DATABASE", "Unable to load the appeal.", error);
  if (!data) return null;
  return toView(data as Record<string, unknown>);
}

/** Loads the appeal for one application for municipal review (or null). */
export async function getAppealForMunicipality(applicationId: string): Promise<AppealView | null> {
  const admin = createSupabaseAdminClient();
  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, grants!inner(municipality_id)")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) throw new AppError("DATABASE", "Unable to load the application.", applicationError);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  const grant = application.grants as unknown as { municipality_id: string };
  await requireMunicipalityAccess(grant.municipality_id);

  const { data, error } = await admin
    .from("appeals")
    .select("id, application_id, status, reason, explanation, decision_note, decided_at, created_at")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (error && (error as { code?: string }).code !== "PGRST116") throw new AppError("DATABASE", "Unable to load the appeal.", error);
  if (!data) return null;
  return toView(data as Record<string, unknown>);
}

const reviewAppealSchema = z.object({
  appealId: z.string().uuid(),
  status: z.enum(["UNDER_REVIEW", "DECISION_MADE"]),
  decisionNote: z.string().trim().max(2_000).optional(),
});

/** Municipality-side review transition for one appeal. */
export async function reviewAppeal(input: unknown): Promise<AppealView> {
  const data = reviewAppealSchema.parse(input);
  const admin = createSupabaseAdminClient();

  const { data: appeal, error } = await admin
    .from("appeals")
    .select("id, application_id, status, applicant_id, reason, explanation, decision_note, decided_at, created_at, applications!inner(id, grants!inner(municipality_id, title))")
    .eq("id", data.appealId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the appeal.", error);
  if (!appeal) throw new AppError("NOT_FOUND", "Appeal not found.");

  const application = appeal.applications as unknown as { grants: { municipality_id: string; title: string } };
  const actor = await requireMunicipalityAccess(application.grants.municipality_id);

  assertAppealTransition(appeal.status as AppealStatus, data.status);

  const { data: updated, error: updateError } = await admin
    .from("appeals")
    .update({
      status: data.status,
      decision_note: data.decisionNote ?? null,
      decided_at: data.status === "DECISION_MADE" ? new Date().toISOString() : null,
    })
    .eq("id", data.appealId)
    .select("id, application_id, status, reason, explanation, decision_note, decided_at, created_at")
    .single();
  if (updateError) throw new AppError("DATABASE", "Unable to update the appeal.", updateError);

  await recordAuditEvent({
    actorId: actor.id,
    action: data.status === "DECISION_MADE" ? "APPEAL_DECIDED" : "APPEAL_UNDER_REVIEW",
    entityType: "appeal",
    entityId: data.appealId,
    metadata: { from: appeal.status, to: data.status },
  });

  if (data.status === "DECISION_MADE") {
    await createNotification({
      userId: String(appeal.applicant_id),
      applicationId: String(appeal.application_id),
      type: "APPLICATION_STATUS",
      title: "Appeal decision made",
      message: `A final decision on your appeal for “${application.grants.title}” is available.`,
    });
  }

  return toView(updated as Record<string, unknown>);
}
