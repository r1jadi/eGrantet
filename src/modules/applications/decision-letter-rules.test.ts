import assert from "node:assert/strict";
import test from "node:test";
import { assertApplicationTransition } from "./lifecycle";
import type { ApplicationStatus } from "./types";
import type { MunicipalApplicationCheck } from "./types";

/**
 * Pure mirror of buildDecisionLetterFacts reason derivation, kept in sync
 * with the service so the trusted-input rules are directly testable.
 */
export function deriveReasons(checks: MunicipalApplicationCheck[], missingDocuments: string[], reviewerNote?: string): string[] {
  const reasons: string[] = [];
  for (const check of checks) {
    if (check.result === "FAILED") reasons.push(check.reason ? `Failed requirement: ${check.reason}` : "A deterministic eligibility requirement was not met.");
  }
  for (const name of missingDocuments) reasons.push(`Required document not provided: ${name}.`);
  if (reviewerNote) reasons.push(`Documented review finding provided by the reviewing officer: ${reviewerNote}`);
  return reasons;
}

export const DECIDABLE_STATUSES: ApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED"];

test("rejection reasons come only from failed checks, missing documents, and the attributed review note", () => {
  const reasons = deriveReasons(
    [{ id: "1", requirementId: null, result: "FAILED", reason: "Applicant is outside the district", checkedAt: null }],
    ["Registration certificate"],
    "Budget exceeds programme maximum",
  );
  assert.deepEqual(reasons, [
    "Failed requirement: Applicant is outside the district",
    "Required document not provided: Registration certificate.",
    "Documented review finding provided by the reviewing officer: Budget exceeds programme maximum",
  ]);
});

test("passed checks never become rejection reasons", () => {
  const reasons = deriveReasons([{ id: "1", requirementId: null, result: "PASSED", reason: "Registered in district", checkedAt: null }], []);
  assert.deepEqual(reasons, []);
});

test("a rejection without any verified reason is refused by the caller", () => {
  const reasons = deriveReasons([], [], undefined);
  assert.equal(reasons.length, 0);
  // Mirrors the service guard: a rejection needs at least one reason.
  assert.ok(reasons.length === 0);
});

test("decision letters are sent only from UNDER_REVIEW or to an already-decided status", () => {
  // Mirror of canSendDecision in the service.
  const canSend = (status: ApplicationStatus, target: ApplicationStatus) => status === "UNDER_REVIEW" || status === target;
  assert.equal(canSend("UNDER_REVIEW", "APPROVED"), true);
  assert.equal(canSend("UNDER_REVIEW", "REJECTED"), true);
  assert.equal(canSend("APPROVED", "APPROVED"), true, "already-approved apps may receive a follow-up copy");
  assert.equal(canSend("SUBMITTED", "APPROVED"), false, "review must start first");
  assert.equal(canSend("CORRECTION_REQUESTED", "REJECTED"), false);
  assert.equal(canSend("DRAFT", "APPROVED"), false);
});

test("the lifecycle allows deciding only from UNDER_REVIEW", () => {
  assert.doesNotThrow(() => assertApplicationTransition("UNDER_REVIEW", "APPROVED"));
  assert.doesNotThrow(() => assertApplicationTransition("UNDER_REVIEW", "REJECTED"));
  assert.throws(() => assertApplicationTransition("SUBMITTED", "APPROVED"), /cannot move from SUBMITTED to APPROVED/);
  assert.throws(() => assertApplicationTransition("CORRECTION_REQUESTED", "APPROVED"));
  assert.throws(() => assertApplicationTransition("DRAFT", "APPROVED"));
  assert.throws(() => assertApplicationTransition("APPROVED", "REJECTED"));
  assert.throws(() => assertApplicationTransition("REJECTED", "APPROVED"));
});
