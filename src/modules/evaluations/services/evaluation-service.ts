import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { requireMunicipalityAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { requireGrantContext } from "@/modules/grants";
import { evaluationCriterionContractSchema } from "../schemas";
import type { CriterionScoringMode } from "../scoring";
import type { EvaluationCriterion } from "../types";

const criterionSelect = "id, grant_id, name, description, maximum_score, weight, display_order, is_active, scoring_mode, auto_config, created_at, updated_at";

type CriterionRow = {
  id: string;
  grant_id: string;
  name: string;
  description: string;
  maximum_score: number;
  weight: number;
  display_order: number;
  is_active: boolean;
  scoring_mode: CriterionScoringMode;
  auto_config: unknown;
  created_at: string;
  updated_at: string;
};

/** Cached per-process check that migration 20260926100000 has been applied. */
let criteriaColumnsReady: boolean | null = null;
async function criteriaColumnsAvailable(): Promise<boolean> {
  if (criteriaColumnsReady !== null) return criteriaColumnsReady;
  const { error } = await createSupabaseAdminClient().from("evaluation_criteria").select("is_active").limit(1);
  criteriaColumnsReady = !error;
  return criteriaColumnsReady;
}

/** Cached per-process check for the evaluations.criterion_scores column. */
let evaluationsColumnsReady: boolean | null = null;
export async function evaluationsColumnsAvailable(): Promise<boolean> {
  if (evaluationsColumnsReady !== null) return evaluationsColumnsReady;
  const { error } = await createSupabaseAdminClient().from("evaluations").select("criterion_scores").limit(1);
  evaluationsColumnsReady = !error;
  return evaluationsColumnsReady;
}

function toContract(row: CriterionRow): EvaluationCriterion {
  return {
    id: row.id,
    grantId: row.grant_id,
    name: row.name,
    description: row.description,
    maximumScore: Number(row.maximum_score),
    weight: Number(row.weight),
    displayOrder: row.display_order,
    isActive: row.is_active,
    scoringMode: row.scoring_mode,
    autoConfig: (row.auto_config ?? null) as EvaluationCriterion["autoConfig"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates or updates an evaluation criterion for a draft grant.
 * Municipal ownership and draft-only editing are enforced through the shared
 * grant context helper before any mutation happens.
 */
export async function saveEvaluationCriterion(grantId: string, input: unknown, criterionId?: string) {
  const data = evaluationCriterionContractSchema.parse(input);
  const { actorId } = await requireGrantContext(grantId);
  const admin = createSupabaseAdminClient();
  const payload: Record<string, unknown> = {
    grant_id: grantId,
    name: data.name,
    description: data.description,
    maximum_score: data.maximumScore,
    weight: data.weight,
    display_order: data.displayOrder,
  };
  // New columns are added when migration 20260926100000 is applied; they are
  // detected at write time so saving still works against the legacy schema.
  if (await criteriaColumnsAvailable()) {
    payload.is_active = data.isActive;
    payload.scoring_mode = data.scoringMode;
    payload.auto_config = data.scoringMode === "AUTOMATIC" ? data.autoConfig : {};
  }
  // `*` works against both the legacy and extended schema.
  const response = criterionId
    ? await admin.from("evaluation_criteria").update(payload).eq("id", criterionId).eq("grant_id", grantId).select("*").single()
    : await admin.from("evaluation_criteria").insert(payload).select("*").single();
  if (response.error) throw new AppError("DATABASE", "Unable to save the evaluation criterion.", response.error);
  await recordAuditEvent({
    actorId,
    action: criterionId ? "EVALUATION_CRITERION_UPDATED" : "EVALUATION_CRITERION_CREATED",
    entityType: "evaluation_criterion",
    entityId: response.data.id,
    metadata: { grantId, displayOrder: data.displayOrder, scoringMode: data.scoringMode },
  });
  return toContract({ is_active: true, scoring_mode: "MANUAL", auto_config: null, ...response.data } as CriterionRow);
}

export async function deleteEvaluationCriterion(grantId: string, criterionId: string) {
  const { actorId } = await requireGrantContext(grantId);
  const { error, count } = await createSupabaseAdminClient()
    .from("evaluation_criteria")
    .delete({ count: "exact" })
    .eq("id", criterionId)
    .eq("grant_id", grantId);
  if (error) throw new AppError("DATABASE", "Unable to remove the evaluation criterion.", error);
  if (!count) throw new AppError("NOT_FOUND", "Evaluation criterion not found.");
  await recordAuditEvent({ actorId, action: "EVALUATION_CRITERION_DELETED", entityType: "evaluation_criterion", entityId: criterionId, metadata: { grantId } });
}

/** All criteria of a grant (including inactive), ordered — used by scoring and the manager UI. */
export async function listEvaluationCriteriaForGrant(grantId: string): Promise<EvaluationCriterion[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("evaluation_criteria")
    .select(criterionSelect)
    .eq("grant_id", grantId)
    .order("display_order", { ascending: true });
  if (error) {
    if ((error as { code?: string }).code !== "42703") throw new AppError("DATABASE", "Unable to load evaluation criteria.", error);
    const legacy = await admin
      .from("evaluation_criteria")
      .select("id, grant_id, name, description, maximum_score, weight, display_order, created_at, updated_at")
      .eq("grant_id", grantId)
      .order("display_order", { ascending: true });
    if (legacy.error) throw new AppError("DATABASE", "Unable to load evaluation criteria.", legacy.error);
    return (legacy.data as CriterionRow[]).map((row) => toContract({ ...row, is_active: true, scoring_mode: "MANUAL", auto_config: {} }));
  }
  return (data as CriterionRow[]).map(toContract);
}

/** Thin alias kept for existing callers. */
export const listEvaluationCriteria = listEvaluationCriteriaForGrant;

/** Reorders criteria atomically; draft grants only (same rule as requirements). */
export async function reorderEvaluationCriteria(grantId: string, orderedCriterionIds: string[]) {
  const { actorId, status } = await requireGrantContext(grantId);
  if (status !== "DRAFT") throw new AppError("AUTHORIZATION", "Criteria can only be changed on draft grants.");
  const admin = createSupabaseAdminClient();
  const { data: existing, error } = await admin.from("evaluation_criteria").select("id").eq("grant_id", grantId);
  if (error) throw new AppError("DATABASE", "Unable to load evaluation criteria.", error);
  const existingIds = new Set(existing.map((criterion) => criterion.id));
  const unique = [...new Set(orderedCriterionIds)];
  if (orderedCriterionIds.length !== existingIds.size || unique.length !== existingIds.size || !unique.every((id) => existingIds.has(id))) {
    throw new AppError("VALIDATION", "The criterion order is invalid.");
  }
  await Promise.all(unique.map((criterionId, index) =>
    admin.from("evaluation_criteria").update({ display_order: index }).eq("id", criterionId).eq("grant_id", grantId),
  ));
  await recordAuditEvent({ actorId, action: "EVALUATION_CRITERIA_REORDERED", entityType: "grant", entityId: grantId, metadata: { count: unique.length } });
  return { reordered: unique.length };
}

/** Active criteria for scoring, including legacy rows without the new columns (migration pending). */
const scoringColumnsSchema = z.object({
  id: z.string(),
  name: z.string(),
  maximum_score: z.number(),
  display_order: z.number(),
  is_active: z.boolean().default(true),
  scoring_mode: z.enum(["MANUAL", "AUTOMATIC"]).default("MANUAL"),
  auto_config: z.unknown().default({}),
});

/** Loads the grant's active criteria in the scoring-core shape (no auth needed beyond caller checks). */
export async function listActiveScoringCriteria(grantId: string) {
  const admin = createSupabaseAdminClient();
  const extended = await admin
    .from("evaluation_criteria")
    .select("id, name, maximum_score, display_order, is_active, scoring_mode, auto_config")
    .eq("grant_id", grantId)
    .order("display_order", { ascending: true });
  let rows: Array<Record<string, unknown>>;
  if (extended.error) {
    // 42703 = migration 20260926100000 not applied: legacy rows are all active MANUAL criteria.
    if ((extended.error as { code?: string }).code !== "42703") throw new AppError("DATABASE", "Unable to load evaluation criteria.", extended.error);
    const legacy = await admin
      .from("evaluation_criteria")
      .select("id, name, maximum_score, display_order")
      .eq("grant_id", grantId)
      .order("display_order", { ascending: true });
    if (legacy.error) throw new AppError("DATABASE", "Unable to load evaluation criteria.", legacy.error);
    rows = (legacy.data ?? []).map((row) => ({ ...row, is_active: true, scoring_mode: "MANUAL", auto_config: {} }));
  } else {
    rows = extended.data ?? [];
  }
  return rows.map((row) => {
    const parsed = scoringColumnsSchema.parse(row);
    return {
      id: parsed.id,
      name: parsed.name,
      maximumScore: Number(parsed.maximum_score),
      displayOrder: parsed.display_order,
      isActive: parsed.is_active,
      scoringMode: parsed.scoring_mode,
      autoConfig: (parsed.auto_config ?? null) as EvaluationCriterion["autoConfig"],
    };
  });
}
