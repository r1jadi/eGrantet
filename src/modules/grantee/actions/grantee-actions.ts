"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { createMilestone, deleteMilestone, getEvidenceDownloadUrl, reviewMilestoneSubmission, submitMilestoneUpdate, updateMilestone } from "../services/milestone-service";
import { ensureGranteeProjectCreated } from "../services/grantee-project-service";

const uuidSchema = z.uuid();

export interface GranteeActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Municipality: create a milestone. */
export async function createMilestoneAction(_previous: GranteeActionState, formData: FormData): Promise<GranteeActionState> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      title: z.string().trim().min(1).max(200),
      description: z.string().max(5_000).default(""),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be a valid date."),
      requiresEvidence: z.boolean().default(true),
      displayOrder: z.coerce.number().int().nonnegative().default(0),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      description: formData.get("description") || "",
      dueDate: formData.get("dueDate"),
      requiresEvidence: formData.get("requiresEvidence") === "on",
      displayOrder: formData.get("displayOrder") ?? 0,
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "The milestone was invalid." };
  try {
    await createMilestone(parsed.data);
    revalidatePath(`/municipality/projects/${parsed.data.projectId}`);
    return { status: "success", message: "Milestone created." };
  } catch (error) {
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Municipality: update a milestone. */
export async function updateMilestoneAction(_previous: GranteeActionState, formData: FormData): Promise<GranteeActionState> {
  const milestoneId = uuidSchema.safeParse(formData.get("milestoneId"));
  const projectId = uuidSchema.safeParse(formData.get("projectId"));
  if (!milestoneId.success || !projectId.success) return { status: "error", message: "Invalid milestone reference." };
  try {
    await updateMilestone({
      milestoneId: milestoneId.data,
      projectId: projectId.data,
      title: formData.get("title") || undefined,
      description: formData.get("description") || undefined,
      dueDate: formData.get("dueDate") || undefined,
      displayOrder: formData.get("displayOrder") ? Number(formData.get("displayOrder")) : undefined,
    });
    revalidatePath(`/municipality/projects/${projectId.data}`);
    return { status: "success", message: "Milestone updated." };
  } catch (error) {
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Municipality: delete a pending milestone. */
export async function deleteMilestoneAction(_previous: GranteeActionState, formData: FormData): Promise<GranteeActionState> {
  const milestoneId = uuidSchema.safeParse(formData.get("milestoneId"));
  const projectId = uuidSchema.safeParse(formData.get("projectId"));
  if (!milestoneId.success || !projectId.success) return { status: "error", message: "Invalid milestone reference." };
  try {
    await deleteMilestone(milestoneId.data);
    revalidatePath(`/municipality/projects/${projectId.data}`);
    return { status: "success", message: "Milestone deleted." };
  } catch (error) {
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Grantee: submit a milestone update with evidence files. */
export async function submitMilestoneAction(_previous: GranteeActionState, formData: FormData): Promise<GranteeActionState> {
  const milestoneId = uuidSchema.safeParse(formData.get("milestoneId"));
  if (!milestoneId.success) return { status: "error", message: "Invalid milestone reference." };
  const files = formData.getAll("evidence").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  try {
    await submitMilestoneUpdate(
      {
        milestoneId: milestoneId.data,
        message: formData.get("message") || "",
        documentType: formData.get("documentType") || "evidence",
      },
      files,
    );
    revalidatePath("/projects");
    return { status: "success", message: "Evidence submitted for review." };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") return { status: "error", message: error.message };
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Municipality: approve a submission or request corrections. */
export async function reviewMilestoneAction(_previous: GranteeActionState, formData: FormData): Promise<GranteeActionState> {
  const parsed = z
    .object({
      submissionId: z.uuid(),
      decision: z.enum(["APPROVED", "CORRECTION_REQUESTED"]),
      comment: z.string().max(5_000).default(""),
    })
    .safeParse({
      submissionId: formData.get("submissionId"),
      decision: formData.get("decision"),
      comment: formData.get("comment") || "",
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "The review was invalid." };
  if (parsed.data.decision === "CORRECTION_REQUESTED" && !parsed.data.comment) {
    return { status: "error", message: "Please describe what needs to be corrected." };
  }
  try {
    await reviewMilestoneSubmission(parsed.data);
    revalidatePath("/municipality/projects");
    return { status: "success", message: parsed.data.decision === "APPROVED" ? "Milestone approved." : "Correction requested." };
  } catch (error) {
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Either side: opens a short-lived signed URL for evidence the actor can access. */
export async function getEvidenceUrlAction(evidenceId: string): Promise<{ url?: string; error?: string }> {
  const parsed = uuidSchema.safeParse(evidenceId);
  if (!parsed.success) return { error: "Invalid evidence reference." };
  try {
    return { url: await getEvidenceDownloadUrl(parsed.data) };
  } catch (error) {
    return { error: toSafeErrorMessage(error) };
  }
}

/** Retry hook: provisions a project for an approved application lacking one. */
export async function ensureProjectAction(_previous: GranteeActionState, formData: FormData): Promise<GranteeActionState> {
  const applicationId = uuidSchema.safeParse(formData.get("applicationId"));
  if (!applicationId.success) return { status: "error", message: "Invalid application reference." };
  const created = await ensureGranteeProjectCreated(applicationId.data);
  revalidatePath("/municipality/projects");
  return created
    ? { status: "success", message: "Project portal ready." }
    : { status: "error", message: "Project creation failed. Check the server logs." };
}
