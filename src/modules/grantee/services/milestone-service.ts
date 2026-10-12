import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { requireMunicipalityAccess, requireProfile } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { createNotification } from "@/modules/notifications/services/notification-service";
import { getAppUrl } from "@/lib/auth/env";
import { assertMilestoneTransition, buildEvidenceStoragePath, milestoneProgress, validateEvidenceFile, type MilestoneStatus } from "../milestones";
import { milestoneContractSchema, milestoneReviewSchema, milestoneSubmitSchema, milestoneUpdateSchema } from "../schemas";
import { refreshProjectProgress } from "./grantee-project-service";

async function loadMilestone(milestoneId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("project_milestones")
    .select("id, project_id, title, status, due_date, requires_evidence")
    .eq("id", milestoneId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the milestone.", error);
  if (!data) throw new AppError("NOT_FOUND", "Milestone not found.");
  return data as unknown as { id: string; project_id: string; title: string; status: MilestoneStatus; due_date: string; requires_evidence: boolean };
}

async function loadProject(projectId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("grantee_projects")
    .select("id, municipality_id, grantee_id, application_id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the project.", error);
  if (!data) throw new AppError("NOT_FOUND", "Project not found.");
  return data as unknown as { id: string; municipality_id: string; grantee_id: string; application_id: string; title: string };
}

/** Creates a milestone on an awarded project (municipality only). */
export async function createMilestone(input: unknown) {
  const data = milestoneContractSchema.parse(input);
  const project = await loadProject(data.projectId);
  const actor = await requireMunicipalityAccess(project.municipality_id);
  const { data: milestone, error } = await createSupabaseAdminClient()
    .from("project_milestones")
    .insert({
      project_id: data.projectId,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
      requires_evidence: data.requiresEvidence,
      display_order: data.displayOrder,
      status: "PENDING",
      progress: 0,
    })
    .select("id")
    .single();
  if (error) throw new AppError("DATABASE", "Unable to create the milestone.", error);
  await recordAuditEvent({
    actorId: actor.id,
    action: "MILESTONE_CREATED",
    entityType: "project_milestone",
    entityId: milestone.id as string,
    metadata: { projectId: data.projectId, dueDate: data.dueDate, displayOrder: data.displayOrder },
  });
  await createNotification({
    userId: project.grantee_id,
    applicationId: project.application_id,
    type: "MILESTONE",
    title: `New milestone: ${data.title}`,
    message: `A milestone was added to your project. Due ${data.dueDate}.`,
  });
  return milestone;
}

/** Updates milestone configuration (municipality only; approved milestones are locked). */
export async function updateMilestone(input: unknown) {
  const data = milestoneUpdateSchema.parse(input);
  const milestone = await loadMilestone(data.milestoneId);
  const project = await loadProject(milestone.project_id);
  await requireMunicipalityAccess(project.municipality_id);
  if (milestone.status === "APPROVED") throw new AppError("CONFLICT", "Approved milestones can no longer be changed.");
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.dueDate !== undefined) payload.due_date = data.dueDate;
  if (data.requiresEvidence !== undefined) payload.requires_evidence = data.requiresEvidence;
  if (data.displayOrder !== undefined) payload.display_order = data.displayOrder;
  const { error } = await createSupabaseAdminClient().from("project_milestones").update(payload).eq("id", data.milestoneId);
  if (error) throw new AppError("DATABASE", "Unable to update the milestone.", error);
  await recordAuditEvent({
    action: "MILESTONE_UPDATED",
    entityType: "project_milestone",
    entityId: data.milestoneId,
    metadata: { projectId: milestone.project_id, fields: Object.keys(payload) },
  });
  return { updated: true };
}

/** Deletes a milestone (municipality only; pending milestones only). */
export async function deleteMilestone(milestoneId: string) {
  const milestone = await loadMilestone(milestoneId);
  const project = await loadProject(milestone.project_id);
  const actor = await requireMunicipalityAccess(project.municipality_id);
  if (milestone.status !== "PENDING") throw new AppError("CONFLICT", "Only pending milestones can be deleted.");
  const { error } = await createSupabaseAdminClient().from("project_milestones").delete().eq("id", milestoneId);
  if (error) throw new AppError("DATABASE", "Unable to delete the milestone.", error);
  await recordAuditEvent({
    actorId: actor.id,
    action: "MILESTONE_DELETED",
    entityType: "project_milestone",
    entityId: milestoneId,
    metadata: { projectId: milestone.project_id },
  });
  await refreshProjectProgress(milestone.project_id);
  return { deleted: true };
}

/**
 * Grantee submits a milestone update: optional note plus evidence/photo
 * uploads. Files follow the application-document security rules (PDF/PNG/JPEG,
 * ≤10 MB) and land under grantee-projects/{projectId}/{submissionId}/ in the
 * private bucket. Transitions the milestone PENDING/CORRECTION_REQUESTED → SUBMITTED.
 */
export async function submitMilestoneUpdate(input: unknown, files: File[]) {
  const data = milestoneSubmitSchema.parse(input);
  const profile = await requireProfile();
  const milestone = await loadMilestone(data.milestoneId);
  const project = await loadProject(milestone.project_id);
  if (project.grantee_id !== profile.id) throw new AppError("AUTHORIZATION", "You do not manage this project.");

  if (milestone.requires_evidence && (!files || files.length === 0)) {
    throw new AppError("VALIDATION", "This milestone requires at least one evidence file.");
  }
  for (const file of files ?? []) {
    const problem = validateEvidenceFile({ type: file.type, size: file.size });
    if (problem) throw new AppError("VALIDATION", `${file.name}: ${problem}`);
  }

  const previousStatus = milestone.status;
  assertMilestoneTransition(previousStatus, "SUBMITTED");

  const admin = createSupabaseAdminClient();
  const { data: submission, error: submissionError } = await admin
    .from("milestone_submissions")
    .insert({
      milestone_id: milestone.id,
      grantee_id: profile.id,
      kind: "EVIDENCE",
      message: data.message,
      status: "SUBMITTED",
    })
    .select("id")
    .single();
  if (submissionError) throw new AppError("DATABASE", "Unable to save the submission.", submissionError);

  const uploaded: string[] = [];
  try {
    for (const file of files ?? []) {
      const evidenceId = randomUUID();
      const storagePath = buildEvidenceStoragePath(project.id, submission.id as string, evidenceId, file.name);
      const { error: uploadError } = await admin.storage.from("grantee-projects").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new AppError("EXTERNAL_SERVICE", "Unable to upload the evidence file.", uploadError);
      const { error: evidenceError } = await admin.from("milestone_evidence").insert({
        id: evidenceId,
        submission_id: submission.id as string,
        file_name: file.name,
        storage_path: storagePath,
        document_type: data.documentType,
        content_type: file.type,
        file_size_bytes: file.size,
      });
      if (evidenceError) throw new AppError("DATABASE", "Unable to save the evidence metadata.", evidenceError);
      uploaded.push(storagePath);
    }
  } catch (error) {
    // Compensating cleanup mirrors the application-document uploader.
    if (uploaded.length) await admin.storage.from("grantee-projects").remove(uploaded);
    const { error: cleanupError } = await admin.from("milestone_submissions").delete().eq("id", submission.id as string);
    if (cleanupError) throw error;
    if (error instanceof AppError) throw error;
    throw new AppError("EXTERNAL_SERVICE", "Unable to upload the evidence files.", error);
  }

  const { error: milestoneError } = await admin
    .from("project_milestones")
    .update({ status: "SUBMITTED", progress: milestoneProgress("SUBMITTED") })
    .eq("id", milestone.id);
  if (milestoneError) throw new AppError("DATABASE", "Unable to update the milestone status.", milestoneError);
  await refreshProjectProgress(project.id);

  await recordAuditEvent({
    actorId: profile.id,
    action: previousStatus === "CORRECTION_REQUESTED" ? "MILESTONE_EVIDENCE_RESUBMITTED" : "MILESTONE_EVIDENCE_SUBMITTED",
    entityType: "milestone_submission",
    entityId: submission.id as string,
    metadata: {
      milestoneId: milestone.id,
      projectId: project.id,
      files: (files ?? []).map((file) => file.name),
      fileCount: files?.length ?? 0,
    },
  });
  await createNotification({
    userId: project.grantee_id,
    applicationId: project.application_id,
    type: "MILESTONE",
    title: `Evidence submitted for ${milestone.title}`,
    message: "Your milestone submission is awaiting municipality review.",
  });
  await notifyMunicipalityMembers(project.municipality_id, project.application_id, `Evidence submitted for ${milestone.title}`, "A grantee submitted milestone evidence for review.");
  return { submissionId: submission.id as string, status: "SUBMITTED" as const };
}

/** Municipality review of a submission: approve the milestone or request corrections. */
export async function reviewMilestoneSubmission(input: unknown) {
  const data = milestoneReviewSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const { data: submission, error } = await admin
    .from("milestone_submissions")
    .select("id, milestone_id, grantee_id, status")
    .eq("id", data.submissionId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the submission.", error);
  if (!submission) throw new AppError("NOT_FOUND", "Submission not found.");
  const milestone = await loadMilestone(submission.milestone_id as string);
  const project = await loadProject(milestone.project_id);
  const actor = await requireMunicipalityAccess(project.municipality_id);

  if (submission.status !== "SUBMITTED") throw new AppError("CONFLICT", "This submission was already reviewed.");
  assertMilestoneTransition(milestone.status, data.decision);

  const { error: updateError } = await admin
    .from("milestone_submissions")
    .update({
      status: data.decision,
      review_comment: data.comment || null,
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", data.submissionId);
  if (updateError) throw new AppError("DATABASE", "Unable to record the review.", updateError);

  const { error: milestoneError } = await admin
    .from("project_milestones")
    .update({
      status: data.decision,
      progress: milestoneProgress(data.decision),
    })
    .eq("id", milestone.id);
  if (milestoneError) throw new AppError("DATABASE", "Unable to update the milestone status.", milestoneError);
  await refreshProjectProgress(project.id);

  await recordAuditEvent({
    actorId: actor.id,
    action: data.decision === "APPROVED" ? "MILESTONE_APPROVED" : "MILESTONE_CORRECTION_REQUESTED",
    entityType: "milestone_submission",
    entityId: data.submissionId,
    metadata: { milestoneId: milestone.id, projectId: project.id, decision: data.decision, comment: data.comment },
  });
  const title = data.decision === "APPROVED" ? `Milestone approved: ${milestone.title}` : `Correction requested: ${milestone.title}`;
  await createNotification({
    userId: project.grantee_id,
    applicationId: project.application_id,
    type: "MILESTONE",
    title,
    message: data.decision === "APPROVED" ? "The municipality approved this milestone." : data.comment || "The municipality requested changes to this milestone submission.",
  });
  // Milestone review email follows the same domain event (preference-gated).
  try {
    const { notifyUser, applicationUrl } = await import("@/modules/notifications/services/email-notification-service");
    const applicationId = project.application_id as string | null;
    await notifyUser({
      userId: project.grantee_id,
      applicationId: applicationId ?? undefined,
      category: "milestone_updates",
      inApp: { type: "MILESTONE", title, message: title },
      email: {
        templateKind: "milestone",
        eventKey: `milestone:${milestone.id}:review:${data.decision}`,
        variables: { milestone: milestone.title, status: data.decision, applicationUrl: applicationId ? applicationUrl(applicationId) : getAppUrl() },
      },
    });
  } catch {
    // Email must never block the review workflow.
  }
  return { decision: data.decision };
}

/** Returns a time-limited signed URL for evidence inside a project the actor can access. */
export async function getEvidenceDownloadUrl(evidenceId: string): Promise<string> {
  // Strict ID shape before any database interaction (defense in depth; the
  // query itself is parameterized through the Supabase client).
  if (!z.uuid().safeParse(evidenceId).success) throw new AppError("NOT_FOUND", "Evidence not found.");
  const admin = createSupabaseAdminClient();
  const { data: evidence, error } = await admin
    .from("milestone_evidence")
    .select("id, storage_path, submission_id")
    .eq("id", evidenceId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the evidence.", error);
  if (!evidence) throw new AppError("NOT_FOUND", "Evidence not found.");
  const { data: submission } = await admin
    .from("milestone_submissions")
    .select("milestone_id")
    .eq("id", evidence.submission_id as string)
    .maybeSingle();
  const milestone = submission ? await loadMilestone(submission.milestone_id as string) : null;
  const project = milestone ? await loadProject(milestone.project_id) : null;
  if (!project) throw new AppError("NOT_FOUND", "Evidence not found.");
  await requireMunicipalityAccess(project.municipality_id);
  const { data: signed, error: signedError } = await admin.storage.from("grantee-projects").createSignedUrl(evidence.storage_path as string, 300);
  if (signedError || !signed) throw new AppError("EXTERNAL_SERVICE", "Unable to open the evidence file.", signedError);
  return signed.signedUrl;
}

/** Notifies municipality members about grantee activity. */
async function notifyMunicipalityMembers(municipalityId: string, applicationId: string, title: string, message: string): Promise<void> {
  try {
    const { data: members } = await createSupabaseAdminClient().from("municipality_members").select("user_id").eq("municipality_id", municipalityId);
    for (const member of members ?? []) {
      await createNotification({ userId: member.user_id as string, applicationId, type: "MILESTONE", title, message });
    }
  } catch {
    // best-effort
  }
}
