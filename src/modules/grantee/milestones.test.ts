import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_EVIDENCE_CONTENT_TYPES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
  assertMilestoneTransition,
  buildEvidenceStoragePath,
  calculateProjectProgress,
  isMilestoneOverdue,
  isMilestoneStalled,
  isProjectComplete,
  milestoneProgress,
  validateEvidenceFile,
} from "./milestones";

test("milestone transitions follow the review lifecycle", () => {
  assertMilestoneTransition("PENDING", "SUBMITTED");
  assertMilestoneTransition("SUBMITTED", "APPROVED");
  assertMilestoneTransition("SUBMITTED", "CORRECTION_REQUESTED");
  assertMilestoneTransition("CORRECTION_REQUESTED", "SUBMITTED");
  assert.throws(() => assertMilestoneTransition("PENDING", "APPROVED"), /INVALID_MILESTONE_TRANSITION/);
  assert.throws(() => assertMilestoneTransition("APPROVED", "SUBMITTED"), /INVALID_MILESTONE_TRANSITION/);
  assert.throws(() => assertMilestoneTransition("SUBMITTED", "PENDING"), /INVALID_MILESTONE_TRANSITION/);
});

test("milestone progress derives deterministically from status", () => {
  assert.equal(milestoneProgress("PENDING"), 0);
  assert.equal(milestoneProgress("CORRECTION_REQUESTED"), 25);
  assert.equal(milestoneProgress("SUBMITTED"), 50);
  assert.equal(milestoneProgress("APPROVED"), 100);
});

test("project progress is the rounded mean of milestone progress", () => {
  assert.equal(calculateProjectProgress([]), 0);
  assert.equal(calculateProjectProgress([{ status: "APPROVED" }, { status: "PENDING" }]), 50);
  assert.equal(calculateProjectProgress([{ status: "SUBMITTED" }, { status: "SUBMITTED" }, { status: "APPROVED" }]), 67);
});

test("project completion requires at least one milestone and all approved", () => {
  assert.equal(isProjectComplete([]), false);
  assert.equal(isProjectComplete([{ status: "APPROVED" }]), true);
  assert.equal(isProjectComplete([{ status: "APPROVED" }, { status: "SUBMITTED" }]), false);
});

test("overdue detection excludes approved milestones and respects the due date", () => {
  const today = new Date("2026-10-15T12:00:00Z");
  assert.equal(isMilestoneOverdue({ status: "PENDING", dueDate: "2026-10-10" }, today), true);
  assert.equal(isMilestoneOverdue({ status: "SUBMITTED", dueDate: "2026-10-10" }, today), true);
  assert.equal(isMilestoneOverdue({ status: "APPROVED", dueDate: "2026-10-10" }, today), false);
  assert.equal(isMilestoneOverdue({ status: "PENDING", dueDate: "2026-10-20" }, today), false);
});

test("stalled detection flags old unreviewed submissions only", () => {
  const today = new Date("2026-10-15T12:00:00Z");
  assert.equal(isMilestoneStalled("2026-09-01T00:00:00Z", 14, today), true);
  assert.equal(isMilestoneStalled("2026-10-10T00:00:00Z", 14, today), false);
  assert.equal(isMilestoneStalled(null, 14, today), false);
});

test("evidence validation enforces the document security rules", () => {
  for (const type of ALLOWED_EVIDENCE_CONTENT_TYPES) {
    assert.equal(validateEvidenceFile({ type, size: 1024 }), null);
  }
  assert.match(validateEvidenceFile({ type: "application/zip", size: 1024 }) ?? "", /PDF, PNG, and JPEG/);
  assert.match(validateEvidenceFile({ type: "application/pdf", size: MAX_EVIDENCE_FILE_SIZE_BYTES + 1 }) ?? "", /10 MB/);
  assert.match(validateEvidenceFile({ type: "application/pdf", size: 0 }) ?? "", /10 MB/);
});

test("storage paths are namespaced by project and submission with sanitized names", () => {
  const path = buildEvidenceStoragePath("p1", "s1", "d1", "../evil invoice.pdf");
  assert.equal(path, "grantee-projects/p1/s1/d1/.._evil_invoice.pdf");
  assert.equal(buildEvidenceStoragePath("p1", "s1", "d1", ""), "grantee-projects/p1/s1/d1/document");
});
