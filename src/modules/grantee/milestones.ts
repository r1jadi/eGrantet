/**
 * Milestone lifecycle: deterministic transitions, progress calculation and
 * overdue detection. Pure functions only — no IO, no AI — so project progress
 * is always reproducible from stored milestone states.
 */

export type MilestoneStatus = "PENDING" | "SUBMITTED" | "CORRECTION_REQUESTED" | "APPROVED";

/** Allowed milestone transitions (grantee submissions and municipality reviews). */
export const MILESTONE_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
  PENDING: ["SUBMITTED"],
  SUBMITTED: ["CORRECTION_REQUESTED", "APPROVED"],
  CORRECTION_REQUESTED: ["SUBMITTED"],
  APPROVED: [],
};

export function assertMilestoneTransition(from: MilestoneStatus, to: MilestoneStatus): void {
  if (!MILESTONE_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`INVALID_MILESTONE_TRANSITION:${from}->${to}`);
  }
}

/** A milestone's progress, derived only from its stored status. */
export function milestoneProgress(status: MilestoneStatus): number {
  switch (status) {
    case "APPROVED": return 100;
    case "SUBMITTED": return 50;
    case "CORRECTION_REQUESTED": return 25;
    case "PENDING": return 0;
  }
}

/** Project progress = mean milestone progress, rounded to whole percents. */
export function calculateProjectProgress(milestones: Array<{ status: MilestoneStatus }>): number {
  if (milestones.length === 0) return 0;
  const total = milestones.reduce((sum, milestone) => sum + milestoneProgress(milestone.status as MilestoneStatus), 0);
  return Math.round(total / milestones.length);
}

/** True when every milestone has reached APPROVED. */
export function isProjectComplete(milestones: Array<{ status: MilestoneStatus }>): boolean {
  return milestones.length > 0 && milestones.every((milestone) => milestone.status === "APPROVED");
}

/** A milestone is overdue when it is not approved and its due date has passed. */
export function isMilestoneOverdue(milestone: { status: MilestoneStatus; dueDate: string }, today: Date = new Date()): boolean {
  if (milestone.status === "APPROVED") return false;
  const due = new Date(`${milestone.dueDate}T23:59:59`);
  return due.getTime() < today.getTime();
}

/** A submitted milestone awaiting municipality review for at least this long is stalled. */
export function isMilestoneStalled(submittedAt: string | null | undefined, staleAfterDays = 14, today: Date = new Date()): boolean {
  if (!submittedAt) return false;
  const stale = new Date(today);
  stale.setDate(stale.getDate() - staleAfterDays);
  return new Date(submittedAt).getTime() < stale.getTime();
}

export type SubmissionKind = "EVIDENCE" | "PHOTO" | "NOTE";

/** Same security rules as application documents: PDF/PNG/JPEG, ≤10 MB. */
export const ALLOWED_EVIDENCE_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Validates an evidence file against the existing document security rules. */
export function validateEvidenceFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_EVIDENCE_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_EVIDENCE_CONTENT_TYPES)[number])) {
    return "Only PDF, PNG, and JPEG files are allowed.";
  }
  if (file.size <= 0 || file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return "Document size must be between 1 byte and 10 MB.";
  }
  return null;
}

/** Storage path builder: grantee-projects/{projectId}/{submissionId}/{uuid}/{safeName}. */
export function buildEvidenceStoragePath(projectId: string, submissionId: string, documentId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "document";
  return `grantee-projects/${projectId}/${submissionId}/${documentId}/${safeName}`;
}
