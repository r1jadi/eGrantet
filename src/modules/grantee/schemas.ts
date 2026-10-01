import { z } from "zod";

/** Milestone configuration input (municipality, post-award). */
export const milestoneContractSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5_000).default(""),
  /** ISO date (YYYY-MM-DD). */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be a valid date."),
  requiresEvidence: z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0),
});

export const milestoneUpdateSchema = milestoneContractSchema.partial().extend({
  milestoneId: z.uuid(),
});

export const milestoneSubmitSchema = z.object({
  milestoneId: z.uuid(),
  message: z.string().max(5_000).default(""),
  /** Client-specified evidence type label (e.g. "invoice"). */
  documentType: z.string().trim().min(1).max(80).default("evidence"),
});

export const milestoneReviewSchema = z.object({
  submissionId: z.uuid(),
  decision: z.enum(["APPROVED", "CORRECTION_REQUESTED"]),
  comment: z.string().max(5_000).default(""),
});

export const granteeProjectUpdateSchema = z.object({
  projectId: z.uuid(),
  status: z.enum(["ACTIVE", "COMPLETED", "SUSPENDED"]).optional(),
});
