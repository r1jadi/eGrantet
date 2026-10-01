"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toSafeErrorMessage } from "@/lib/errors/app-error";
import { assignEvaluatorToApplication, revokeEvaluatorAssignment } from "../services/evaluation-assignment-service";
import { deleteEvaluationCriterion, listEvaluationCriteria, saveEvaluationCriterion } from "../services/evaluation-service";
import { getBlindApplicationForEvaluator, getEvaluatorEvaluation, listAssignedApplications, saveEvaluatorEvaluation } from "../../applications/services/evaluator-application-service";

const uuidSchema = z.uuid();

/** Municipality action: create or update an evaluation criterion (draft grants only). */
export async function saveEvaluationCriterionAction(grantId: string, input: unknown, criterionId?: string) {
  return saveEvaluationCriterion(uuidSchema.parse(grantId), input, criterionId ? uuidSchema.parse(criterionId) : undefined);
}

/** Municipality action: delete an evaluation criterion. */
export async function deleteEvaluationCriterionAction(grantId: string, criterionId: string) {
  return deleteEvaluationCriterion(uuidSchema.parse(grantId), uuidSchema.parse(criterionId));
}

/** Municipality action: list a grant's evaluation criteria. */
export async function listEvaluationCriteriaAction(grantId: string) {
  return listEvaluationCriteria(uuidSchema.parse(grantId));
}

/** Lists the signed-in evaluator's assigned applications. */
export async function listAssignedApplicationsAction() {
  return listAssignedApplications();
}

/** Loads the blind application view + own evaluation for the scoring page. */
export async function loadEvaluatorWorkspaceAction(applicationId: string) {
  const id = uuidSchema.parse(applicationId);
  const [application, evaluation] = await Promise.all([
    getBlindApplicationForEvaluator(id),
    getEvaluatorEvaluation(id),
  ]);
  return { application, evaluation };
}

const saveSchema = z.object({
  applicationId: z.uuid(),
  scores: z.record(z.string().min(1).max(100), z.unknown()),
  comment: z.string().max(5_000).default(""),
  expectedUpdatedAt: z.string().optional(),
  submit: z.boolean().default(false),
});

export interface SaveEvaluationState {
  status: "idle" | "success" | "error";
  message?: string;
  totalScore?: number | null;
  complete?: boolean;
  warnings?: string[];
  updatedAt?: string;
  submitted?: boolean;
}

/** Saves or submits the evaluator's scores/comment; safe errors only. */
export async function saveEvaluationAction(_previous: SaveEvaluationState, formData: FormData): Promise<SaveEvaluationState> {
  // Per-criterion inputs arrive as `score-<criterionId>` fields.
  const scores: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^score-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (match && typeof value === "string" && value.trim() !== "") scores[match[1]] = value;
  }
  const parsed = saveSchema.safeParse({
    applicationId: formData.get("applicationId"),
    scores,
    comment: formData.get("comment") || "",
    expectedUpdatedAt: formData.get("expectedUpdatedAt") || undefined,
    submit: formData.get("submit") === "true",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "The evaluation was invalid." };
  }
  try {
    const result = await saveEvaluatorEvaluation(parsed.data);
    revalidatePath(`/evaluator/applications/${parsed.data.applicationId}`);
    revalidatePath("/evaluator");
    return {
      status: "success",
      message: parsed.data.submit ? "Evaluation submitted." : "Draft saved.",
      totalScore: result.totalScore,
      complete: result.complete,
      warnings: result.warnings,
      updatedAt: result.updatedAt,
      submitted: result.status === "SUBMITTED",
    };
  } catch (error) {
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

const assignSchema = z.object({
  applicationId: z.uuid(),
  evaluatorEmail: z.string().trim().toLowerCase().email().max(200),
  blind: z.boolean().default(true),
});

export interface AssignState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Municipality action: assign an evaluator to an application. */
export async function assignEvaluatorAction(_previous: AssignState, formData: FormData): Promise<AssignState> {
  const parsed = assignSchema.safeParse({
    applicationId: formData.get("applicationId"),
    evaluatorEmail: formData.get("evaluatorEmail"),
    blind: formData.get("blind") !== "false",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "The assignment was invalid." };
  }
  try {
    // Authorization lives in the service: requireMunicipalityAccess on the
    // application's grant (staff manage evaluators for their own municipality).
    await assignEvaluatorToApplication(parsed.data);
    revalidatePath(`/municipality/applications/${parsed.data.applicationId}`);
    return { status: "success", message: "Evaluator assigned." };
  } catch (error) {
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

const revokeSchema = z.object({ applicationId: z.uuid(), evaluatorId: z.uuid() });

/** Municipality action: revoke an evaluator assignment. */
export async function revokeEvaluatorAction(_previous: AssignState, formData: FormData): Promise<AssignState> {
  const parsed = revokeSchema.safeParse({
    applicationId: formData.get("applicationId"),
    evaluatorId: formData.get("evaluatorId"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "The request was invalid." };
  }
  try {
    // Authorization lives in the service (requireMunicipalityAccess).
    await revokeEvaluatorAssignment(parsed.data);
    revalidatePath(`/municipality/applications/${parsed.data.applicationId}`);
    return { status: "success", message: "Assignment removed." };
  } catch (error) {
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}
