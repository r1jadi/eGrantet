import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { getCurrentMunicipalityMemberships, requireMunicipalityAccess, requireProfile } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { createNotification } from "@/modules/notifications/services/notification-service";
import { calculateProjectProgress, isMilestoneOverdue, isMilestoneStalled, type MilestoneStatus } from "../milestones";

const projectSelect = "id, application_id, municipality_id, grantee_id, title, awarded_amount, awarded_currency, project_start, project_end, status, progress, created_at, updated_at";
const milestoneSelect = "id, project_id, title, description, due_date, requires_evidence, display_order, status, progress, created_at, updated_at";

export interface MilestoneView {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;
  requiresEvidence: boolean;
  displayOrder: number;
  status: MilestoneStatus;
  progress: number;
  overdue: boolean;
  updatedAt: string;
}

export interface ProjectView {
  id: string;
  applicationId: string;
  title: string;
  awardedAmount: number;
  awardedCurrency: string;
  projectStart: string;
  projectEnd: string;
  status: string;
  progress: number;
  milestones: MilestoneView[];
  overdueCount: number;
  stalledCount: number;
}

function toMilestoneView(row: Record<string, unknown>): MilestoneView {
  const dueDate = String(row.due_date).slice(0, 10);
  const status = row.status as MilestoneStatus;
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    dueDate,
    requiresEvidence: Boolean(row.requires_evidence),
    displayOrder: row.display_order as number,
    status,
    progress: row.progress as number,
    overdue: isMilestoneOverdue({ status, dueDate }),
    updatedAt: row.updated_at as string,
  };
}

async function loadMilestones(projectId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("project_milestones")
    .select(milestoneSelect)
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load milestones.", error);
  return (data ?? []) as unknown as Array<Record<string, unknown>>;
}

/** Recomputes project progress from stored milestone states and persists it. */
export async function refreshProjectProgress(projectId: string): Promise<number> {
  const milestones = await loadMilestones(projectId);
  const progress = calculateProjectProgress(milestones.map((milestone) => ({ status: milestone.status as MilestoneStatus })));
  const { error } = await createSupabaseAdminClient().from("grantee_projects").update({ progress }).eq("id", projectId);
  if (error) throw new AppError("DATABASE", "Unable to update project progress.", error);
  return progress;
}

/**
 * Creates the grantee project for an APPROVED application (idempotent).
 * Called automatically on award; failures are logged, not thrown, so the
 * status transition stays authoritative — the municipality projects page can
 * retry creation for approved applications that lack a project.
 */
export async function ensureGranteeProjectCreated(applicationId: string): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin.from("grantee_projects").select("id").eq("application_id", applicationId).maybeSingle();
    if (existing) return existing.id as string;

    const { data: application, error } = await admin
      .from("applications")
      .select("id, applicant_id, status, grants!inner(title, funding_amount, funding_currency, municipality_id)")
      .eq("id", applicationId)
      .maybeSingle();
    if (error) throw new AppError("DATABASE", "Unable to load the awarded application.", error);
    if (!application) throw new AppError("NOT_FOUND", "Application not found.");
    if (application.status !== "APPROVED") return null;

    const grant = application.grants as unknown as { title: string; funding_amount: number | null; funding_currency: string | null; municipality_id: string };
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    const { data: project, error: insertError } = await admin
      .from("grantee_projects")
      .insert({
        application_id: applicationId,
        municipality_id: grant.municipality_id,
        grantee_id: application.applicant_id,
        title: grant.title,
        awarded_amount: grant.funding_amount ?? 0,
        awarded_currency: grant.funding_currency ?? "EUR",
        project_start: start.toISOString().slice(0, 10),
        project_end: end.toISOString().slice(0, 10),
        status: "ACTIVE",
        progress: 0,
      })
      .select("id")
      .single();
    if (insertError) throw new AppError("DATABASE", "Unable to create the grantee project.", insertError);

    await recordAuditEvent({
      action: "GRANTEE_PROJECT_CREATED",
      entityType: "grantee_project",
      entityId: project.id as string,
      metadata: { applicationId, awardedAmount: grant.funding_amount ?? 0 },
    });
    await createNotification({
      userId: application.applicant_id,
      applicationId,
      type: "MILESTONE",
      title: "Your project portal is ready",
      message: "Congratulations! Your awarded project now has a milestone portal where you can submit evidence and track progress.",
    });
    return project.id as string;
  } catch (error) {
    const { logger } = await import("@/lib/logging/logger");
    logger.error("grantee_project_creation_failed", { applicationId, message: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}

/** The signed-in grantee's project with milestones and progress. */
export async function getGranteeProjectForCurrentUser(): Promise<ProjectView> {
  const profile = await requireProfile();
  const admin = createSupabaseAdminClient();
  const { data: project, error } = await admin.from("grantee_projects").select(projectSelect).eq("grantee_id", profile.id).maybeSingle();
  if (error) {
    // PGRST205 = migration 20260926200000 not applied yet: no portal exists.
    if ((error as { code?: string }).code !== "PGRST205") throw new AppError("DATABASE", "Unable to load your project.", error);
  }
  if (!project) throw new AppError("NOT_FOUND", "No awarded project found.");
  const milestones = (await loadMilestones(project.id as string)).map(toMilestoneView);
  return {
    id: project.id as string,
    applicationId: project.application_id as string,
    title: project.title as string,
    awardedAmount: Number(project.awarded_amount),
    awardedCurrency: project.awarded_currency as string,
    projectStart: String(project.project_start).slice(0, 10),
    projectEnd: String(project.project_end).slice(0, 10),
    status: project.status as string,
    progress: project.progress as number,
    milestones,
    overdueCount: milestones.filter((milestone) => milestone.overdue).length,
    stalledCount: 0,
  };
}

export interface MunicipalityProjectListItem extends ProjectView {
  granteeId: string;
  stalled: boolean;
}

/** Lists member municipalities' projects; generates overdue notifications on access. */
export async function listMunicipalityGranteeProjects(): Promise<MunicipalityProjectListItem[]> {
  const memberships = await getCurrentMunicipalityMemberships();
  if (!memberships.length) return [];
  const admin = createSupabaseAdminClient();
  const { data: projects, error } = await admin
    .from("grantee_projects")
    .select(projectSelect)
    .in("municipality_id", memberships.map((membership) => membership.municipalityId))
    .order("updated_at", { ascending: false });
  // PGRST205 = migration 20260926200000 not applied yet: no projects exist.
  if (error && (error as { code?: string }).code !== "PGRST205") throw new AppError("DATABASE", "Unable to load projects.", error);
  if (error) return [];

  const items: MunicipalityProjectListItem[] = [];
  for (const project of projects ?? []) {
    const milestoneRows = await loadMilestones(project.id as string);
    const milestones = milestoneRows.map(toMilestoneView);
    const stalledCount = milestoneRows.filter((row) => isMilestoneStalled(row.updated_at as string, 14) && row.status === "SUBMITTED").length;
    items.push({
      id: project.id as string,
      applicationId: project.application_id as string,
      title: project.title as string,
      awardedAmount: Number(project.awarded_amount),
      awardedCurrency: project.awarded_currency as string,
      projectStart: String(project.project_start).slice(0, 10),
      projectEnd: String(project.project_end).slice(0, 10),
      status: project.status as string,
      progress: project.progress as number,
      milestones,
      overdueCount: milestones.filter((milestone) => milestone.overdue).length,
      stalledCount,
      granteeId: project.grantee_id as string,
      stalled: stalledCount > 0,
    });
  }
  await notifyOverdueMilestones(items);
  return items;
}

/** Full project detail for the municipality, including submissions and evidence. */
export async function getGranteeProjectForMunicipality(projectId: string) {
  const admin = createSupabaseAdminClient();
  const { data: project, error } = await admin.from("grantee_projects").select(projectSelect).eq("id", projectId).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the project.", error);
  if (!project) throw new AppError("NOT_FOUND", "Project not found.");
  await requireMunicipalityAccess(project.municipality_id as string);

  const [milestoneRows, submissionsResult] = await Promise.all([
    loadMilestones(projectId),
    admin
      .from("milestone_submissions")
      .select("id, milestone_id, grantee_id, kind, message, status, review_comment, reviewed_by, reviewed_at, created_at")
      .eq("milestone_id", (await loadMilestones(projectId)).map((row) => row.id as string))
      .order("created_at", { ascending: false }),
  ]);
  if (submissionsResult.error) throw new AppError("DATABASE", "Unable to load submissions.", submissionsResult.error);
  const submissionIds = (submissionsResult.data ?? []).map((row) => row.id as string);
  const { data: evidence } = submissionIds.length
    ? await admin.from("milestone_evidence").select("id, submission_id, file_name, storage_path, document_type, content_type, file_size_bytes, created_at").in("submission_id", submissionIds)
    : { data: [] };
  const evidenceBySubmission = new Map((evidence ?? []).map((row) => [row.submission_id as string, row]));

  return {
    project: {
      id: project.id as string,
      applicationId: project.application_id as string,
      title: project.title as string,
      awardedAmount: Number(project.awarded_amount),
      awardedCurrency: project.awarded_currency as string,
      projectStart: String(project.project_start).slice(0, 10),
      projectEnd: String(project.project_end).slice(0, 10),
      status: project.status as string,
      progress: project.progress as number,
    },
    milestones: milestoneRows.map(toMilestoneView),
    submissions: (submissionsResult.data ?? []).map((row) => ({
      id: row.id as string,
      milestoneId: row.milestone_id as string,
      kind: row.kind as string,
      message: (row.message as string) ?? "",
      status: row.status as MilestoneStatus,
      reviewComment: (row.review_comment as string | null) ?? null,
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      createdAt: row.created_at as string,
      evidence: (() => {
        const item = evidenceBySubmission.get(row.id as string);
        return item ? { id: item.id as string, fileName: item.file_name as string, documentType: item.document_type as string, fileSizeBytes: Number(item.file_size_bytes) } : null;
      })(),
    })),
  };
}

/** Creates in-app overdue notifications for municipality members (deduped per week). */
async function notifyOverdueMilestones(items: MunicipalityProjectListItem[]): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    for (const item of items) {
      const overdue = item.milestones.filter((milestone) => milestone.overdue);
      if (!overdue.length) continue;
      const { data: members } = await admin.from("municipality_members").select("user_id").eq("municipality_id", (await admin.from("grantee_projects").select("municipality_id").eq("id", item.id).single()).data?.municipality_id ?? "");
      for (const member of members ?? []) {
        const { data: recent } = await admin
          .from("notifications")
          .select("id")
          .eq("user_id", member.user_id as string)
          .eq("application_id", item.applicationId)
          .eq("type", "MILESTONE")
          .ilike("title", "Overdue milestone%")
          .gte("created_at", weekAgo)
          .limit(1);
        if (recent && recent.length) continue;
        await createNotification({
          userId: member.user_id as string,
          applicationId: item.applicationId,
          type: "MILESTONE",
          title: `Overdue milestone in ${item.title}`,
          message: `${overdue.length} milestone(s) are past their due date and still not approved.`,
        });
      }
    }
  } catch {
    // Notification best-effort must never break the listing.
  }
}
