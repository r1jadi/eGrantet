import "server-only";
import { z } from "zod";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { createNotification } from "@/modules/notifications/services/notification-service";
import { DecisionLetterResult, OpenAIDecisionLetterService, type DecisionLetterFacts, type DecisionLetterKind } from "@/modules/ai";
import { getMunicipalApplicationDetail } from "./municipal-application-service";
import { assertApplicationTransition, type ManagedApplicationStatus } from "../lifecycle";
import type { ApplicationStatus } from "../types";

const decisionLetterContentSchema = z.object({
  subject: z.string().trim().min(1, "The letter subject is required.").max(200),
  body: z.string().trim().min(1, "The letter body is required.").max(10_000),
});

export const generateLetterInputSchema = z.object({
  applicationId: z.uuid(),
  decision: z.enum(["ACCEPTANCE", "REJECTION"]),
  /** Documented review finding from the authorized reviewing officer (audited). */
  reviewerNote: z.string().trim().max(2_000).optional(),
});

export const sendLetterInputSchema = decisionLetterContentSchema.extend({
  applicationId: z.uuid(),
  decision: z.enum(["ACCEPTANCE", "REJECTION"]),
  /** Whether the sent text differs from the AI draft; audit metadata only. */
  wasEdited: z.boolean().default(false),
});

const aiService = new OpenAIDecisionLetterService();

/** The lifecycle allows deciding only from UNDER_REVIEW; already-decided applications may receive a follow-up copy. */
function canSendDecision(status: ApplicationStatus, target: ManagedApplicationStatus): boolean {
  return status === "UNDER_REVIEW" || status === target;
}
function targetStatusFor(decision: DecisionLetterKind): ManagedApplicationStatus {
  return decision === "ACCEPTANCE" ? "APPROVED" : "REJECTED";
}

/**
 * Builds the AI input exclusively from trusted server-side data: the
 * application detail (which enforces municipality access), deterministic
 * eligibility checks, and required-document completeness. Rejection reasons
 * are derived here — never accepted from the client — and the reviewer's
 * optional note is clearly attributed as a documented review finding.
 */
export async function buildDecisionLetterFacts(applicationId: string, decision: DecisionLetterKind, reviewerNote?: string): Promise<DecisionLetterFacts> {
  const [detail, checks] = await Promise.all([
    getMunicipalApplicationDetail(applicationId),
    (async () => {
      const client = await createSupabaseServerClient();
      const { data, error } = await client
        .from("eligibility_checks")
        .select("result, reason")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      if (error) throw new AppError("DATABASE", "Unable to load validation results.", error);
      return data ?? [];
    })(),
  ]);

  const client = await createSupabaseServerClient();
  const [requirementsResult, documentsResult] = await Promise.all([
    client.from("grant_requirements").select("id, name").eq("grant_id", detail.grant.id).eq("type", "DOCUMENT").eq("is_required", true),
    client.from("application_documents").select("requirement_id").eq("application_id", applicationId).eq("status", "UPLOADED"),
  ]);
  if (requirementsResult.error) throw new AppError("DATABASE", "Unable to load grant requirements.", requirementsResult.error);
  if (documentsResult.error) throw new AppError("DATABASE", "Unable to load application documents.", documentsResult.error);

  const requiredRequirements = requirementsResult.data ?? [];
  const attachedRequirementIds = new Set((documentsResult.data ?? []).map((row) => row.requirement_id as string | null).filter(Boolean));
  const missingDocuments = requiredRequirements.filter((requirement) => !attachedRequirementIds.has(requirement.id));

  const reasons: string[] = [];
  const positiveNotes: string[] = [];

  for (const check of checks) {
    if (check.result === "FAILED") reasons.push(check.reason ? `Failed requirement: ${check.reason}` : "A deterministic eligibility requirement was not met.");
    else if (check.result === "PASSED") positiveNotes.push(check.reason ? `Verified: ${check.reason}` : "A deterministic eligibility requirement was verified.");
  }
  for (const requirement of missingDocuments) {
    reasons.push(`Required document not provided: ${requirement.name}.`);
  }
  if (missingDocuments.length === 0 && requiredRequirements.length > 0) {
    positiveNotes.push("All required documents were received.");
  }
  if (reviewerNote) reasons.push(`Documented review finding provided by the reviewing officer: ${reviewerNote}`);

  if (decision === "REJECTION" && reasons.length === 0) {
    throw new AppError("VALIDATION", "A rejection letter requires at least one documented reason. Record a validation failure or add a documented review finding first.");
  }

  return {
    decision,
    grantTitle: detail.grant.title,
    applicantName: detail.applicant.fullName ?? "Applicant",
    organisationName: detail.applicant.organisation,
    reference: detail.id,
    submittedAt: detail.submittedAt,
    reasons,
    positiveNotes,
    requestedAmount: detail.grant.fundingAmount !== null && detail.grant.fundingCurrency ? { amount: detail.grant.fundingAmount, currency: detail.grant.fundingCurrency } : null,
  };
}

/** Generates AI wording for the municipality's decision. The decision itself is input, not output. */
export async function generateDecisionLetter(applicationId: string, decision: DecisionLetterKind, reviewerNote?: string): Promise<DecisionLetterResult & { facts: DecisionLetterFacts }> {
  const parsed = generateLetterInputSchema.safeParse({ applicationId, decision, reviewerNote: reviewerNote || undefined });
  if (!parsed.success) throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid letter request.");
  // Authorization: getMunicipalApplicationDetail enforces municipality access.
  const facts = await buildDecisionLetterFacts(parsed.data.applicationId, parsed.data.decision, parsed.data.reviewerNote);
  try {
    const letter = await aiService.generateDecisionLetter(facts);
    return { ...letter, facts };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AI", toSafeErrorMessage(error), error);
  }
}

/**
 * Sends the finalized letter: transitions the application when the decision
 * is still pending (existing status logic stays the source of truth and emits
 * its own notification), otherwise notifies the applicant directly. Always
 * writes a dedicated audit record.
 */
export async function sendDecisionLetter(input: unknown): Promise<{ applicationStatus: ApplicationStatus; notified: boolean }> {
  const parsed = sendLetterInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "The letter could not be sent.");
  const { applicationId, decision, subject, body, wasEdited } = parsed.data;

  const detail = await getMunicipalApplicationDetail(applicationId); // authorization boundary
  const target = targetStatusFor(decision);
  const message = `${subject}\n\n${body}`;
  let applicationStatus = detail.status;
  let notified = false;

  if (detail.status !== target && canSendDecision(detail.status, target)) {
    assertApplicationTransition(detail.status as ManagedApplicationStatus, target);
    // updateMunicipalApplicationStatus performs the lifecycle mutation,
    // writes APPLICATION_STATUS_CHANGED audit, and notifies the applicant.
    const updated = await (await import("./application-service")).updateMunicipalApplicationStatus(applicationId, target, message);
    applicationStatus = updated.status as ApplicationStatus;
    notified = true;
  } else if (detail.status !== target) {
    throw new AppError("VALIDATION", `The application is ${detail.status}. Start the review before sending a decision letter.`);
  } else {
    // Decision already recorded; deliver the letter as a follow-up notification.
    await createNotification({ userId: detail.applicant.id, applicationId, type: "APPLICATION_STATUS", title: subject, message: body });
    notified = true;
  }

  await recordAuditEvent({
    action: "DECISION_LETTER_SENT",
    entityType: "application",
    entityId: applicationId,
    metadata: { decision, subject, aiAssisted: true, wasEdited, applicationStatus },
  });
  return { applicationStatus, notified };
}
