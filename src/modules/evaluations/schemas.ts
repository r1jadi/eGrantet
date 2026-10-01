import { z } from "zod";

export const evaluationCriterionContractSchema = z.object({
  grantId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5_000).default(""),
  maximumScore: z.number().positive().max(1_000),
  weight: z.number().positive().default(1),
  displayOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  scoringMode: z.enum(["MANUAL", "AUTOMATIC"]).default("MANUAL"),
  autoConfig: z
    .object({
      answerKey: z.string().min(1).max(100),
      matchingValues: z.array(z.string().min(1).max(100)).min(1, "At least one matching value is required.").max(50),
      fallbackScore: z.number().min(0).default(0),
    })
    .nullable()
    .default(null),
});

export const evaluationSaveInputSchema = z.object({
  applicationId: z.uuid(),
  /** Per-criterion manual scores keyed by criterion id; automatic criteria are computed server-side. */
  scores: z.record(z.string().min(1).max(100), z.unknown()),
  comment: z.string().max(5_000).default(""),
  /** Optimistic-concurrency token; mismatch produces a clean conflict error. */
  expectedUpdatedAt: z.string().optional(),
  submit: z.boolean().default(false),
});

export const evaluationAssignInputSchema = z.object({
  applicationId: z.uuid(),
  /** Evaluators are addressed by email; their EVALUATOR profile must exist. unresolved → VALIDATION error. */
  evaluatorEmail: z.string().trim().toLowerCase().email().max(200),
  blind: z.boolean().default(true),
});

export const evaluationRevokeInputSchema = z.object({
  applicationId: z.uuid(),
  evaluatorId: z.uuid(),
});
