import "server-only";

/**
 * Deterministic eligibility engine.
 *
 * Evaluates the grant's configured requirements against the application's
 * submitted answers (and submitted documents for DOCUMENT requirements) and
 * persists one `eligibility_checks` row per requirement. It has no AI
 * dependency: objective rules stay objective. The AI verification layer reads
 * these persisted results as authoritative.
 */

import { requireMunicipalityAccess } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";

export interface EligibilityEvaluation {
  requirementId: string | null;
  requirementName: string;
  result: "PASSED" | "FAILED" | "PENDING";
  reason: string;
}

function stringAnswer(answers: Record<string, unknown>, key: string): string | null {
  const value = answers[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Runs the deterministic checks for one submitted application and persists
 * the result rows. Re-running replaces the previous rows (idempotent), so
 * corrections can be re-evaluated after resubmission.
 */
export async function runEligibilityChecks(applicationId: string): Promise<EligibilityEvaluation[]> {
  const admin = createSupabaseAdminClient();
  const { data: application, error } = await admin
    .from("applications")
    .select("id, status, submitted_at, answers, grants!inner(id, municipality_id, funding_amount)")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the application.", error);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  const grant = application.grants as unknown as { municipality_id: string; funding_amount: number | null };
  const actor = await requireMunicipalityAccess(grant.municipality_id);

  const { data: requirements, error: requirementsError } = await admin
    .from("grant_requirements")
    .select("id, name, type, is_required, configuration")
    .eq("grant_id", (application.grants as unknown as { id: string }).id)
    .order("display_order", { ascending: true });
  if (requirementsError) throw new AppError("DATABASE", "Unable to load the grant requirements.", requirementsError);

  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const { data: documents, error: documentsError } = await admin
    .from("application_documents")
    .select("requirement_id, status")
    .eq("application_id", applicationId)
    .eq("status", "UPLOADED");
  if (documentsError) throw new AppError("DATABASE", "Unable to load the application documents.", documentsError);
  const uploadedRequirementIds = new Set((documents ?? []).map((document) => document.requirement_id as string));

  const evaluations: EligibilityEvaluation[] = [];
  for (const requirement of requirements ?? []) {
    const configuration = (requirement.configuration ?? {}) as {
      answerKey?: string;
      expectedAnswer?: string;
      maximumValue?: number;
    };
    let result: EligibilityEvaluation["result"];
    let reason: string;

    if (requirement.type === "DOCUMENT") {
      const present = uploadedRequirementIds.has(requirement.id);
      result = present ? "PASSED" : requirement.is_required ? "FAILED" : "PENDING";
      reason = present
        ? "The required document has been submitted."
        : requirement.is_required
          ? "The required document was not submitted."
          : "The optional document was not submitted.";
    } else if (typeof configuration.answerKey === "string" && configuration.answerKey.trim()) {
      const answer = stringAnswer(answers, configuration.answerKey);
      if (answer === null) {
        result = requirement.is_required ? "FAILED" : "PENDING";
        reason = requirement.is_required
          ? "The required answer was not provided."
          : "The optional answer was not provided.";
      } else if (typeof configuration.expectedAnswer === "string" && configuration.expectedAnswer.trim()) {
        const matches = answer.toLowerCase() === configuration.expectedAnswer.trim().toLowerCase();
        result = matches ? "PASSED" : "FAILED";
        reason = matches
          ? "The answer matches the expected value."
          : `The answer "${answer.slice(0, 100)}" does not match the expected value.`;
      } else {
        result = "PASSED";
        reason = "The required answer was provided.";
      }
    } else if (requirement.type === "FINANCIAL" && typeof configuration.maximumValue === "number") {
      const requested = Number(String(answers.budgetAmount ?? "").replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(requested)) {
        result = requirement.is_required ? "FAILED" : "PENDING";
        reason = "No requested amount was found in the application.";
      } else {
        result = requested <= configuration.maximumValue ? "PASSED" : "FAILED";
        reason = `The requested amount ${requested} is ${requested <= configuration.maximumValue ? "within" : "over"} the limit of ${configuration.maximumValue}.`;
      }
    } else {
      // No deterministic rule applies (e.g. manual/evaluator-judged requirement).
      result = "PENDING";
      reason = "This requirement is verified during human review.";
    }

    evaluations.push({ requirementId: requirement.id, requirementName: requirement.name, result, reason });
  }

  // Replace previous rows so re-runs (e.g. after correction resubmission) stay consistent.
  await admin.from("eligibility_checks").delete().eq("application_id", applicationId);
  if (evaluations.length > 0) {
    const { error: insertError } = await admin.from("eligibility_checks").insert(
      evaluations.map((evaluation) => ({
        application_id: applicationId,
        requirement_id: evaluation.requirementId,
        result: evaluation.result,
        reason: evaluation.reason,
        checked_at: new Date().toISOString(),
      })),
    );
    if (insertError) throw new AppError("DATABASE", "Unable to save the eligibility results.", insertError);
  }

  await recordAuditEvent({
    actorId: actor.id,
    action: "ELIGIBILITY_CHECKED",
    entityType: "application",
    entityId: applicationId,
    metadata: { requirements: evaluations.length, failed: evaluations.filter((evaluation) => evaluation.result === "FAILED").length },
  });
  return evaluations;
}
