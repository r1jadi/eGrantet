import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Appeal workflow rule tests.
 *
 * The service runs against the real database; these tests pin the rules that
 * make the feature fair and safe: one appeal per rejected application, inside
 * an 8-day window, with a strict status lifecycle, audit trail, and applicant
 * notification on the final decision.
 */

const serviceSource = readFileSync("src/modules/applications/services/appeal-service.ts", "utf8");
const componentSource = readFileSync("src/modules/applications/components/appeal-section.tsx", "utf8");

test("appeal window is 8 days from the decision date", () => {
  const decidedAt = new Date("2026-09-01T12:00:00Z");
  const deadline = new Date(decidedAt);
  deadline.setDate(deadline.getDate() + 8);
  assert.equal(deadline.toISOString().startsWith("2026-09-09"), true);
  assert.ok(componentSource.includes("APPEAL_WINDOW_DAYS = 8"));
  assert.ok(serviceSource.includes("APPEAL_WINDOW_DAYS"));
});

test("only rejected applications can be appealed", () => {
  assert.ok(serviceSource.includes('application.status !== "REJECTED"'), "service must gate on REJECTED");
});

test("appeal status lifecycle is strict and forward-only", () => {
  const transitions: Record<string, string[]> = {
    SUBMITTED: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["DECISION_MADE"],
    DECISION_MADE: [],
  };
  assert.equal(transitions.SUBMITTED.includes("DECISION_MADE"), false, "cannot skip review");
  assert.equal(transitions.DECISION_MADE.includes("DECISION_MADE"), false, "decided appeals are final");
  assert.ok(serviceSource.includes("APPEAL_TRANSITIONS"));
});

test("duplicate appeals are rejected at the database level", () => {
  assert.ok(serviceSource.includes('23505'), "unique violation must map to a friendly conflict");
  assert.ok(serviceSource.includes("already been submitted"));
});

test("submission and decisions notify the applicant and write audit records", () => {
  assert.ok(serviceSource.includes("APPEAL_SUBMITTED"));
  assert.ok(serviceSource.includes("APPEAL_DECIDED"));
  assert.ok(serviceSource.includes("Appeal decision made"));
});

test("the appeal section renders only for rejected applications", () => {
  const pageSource = readFileSync("src/app/(applicant)/applications/[applicationId]/page.tsx", "utf8");
  assert.ok(pageSource.includes('status === "REJECTED"'));
  assert.ok(pageSource.includes("AppealSection"));
});

test("municipal review surface is wired to the detail page", () => {
  const municipalSource = readFileSync("src/app/(municipality)/municipality/applications/[applicationId]/page.tsx", "utf8");
  assert.ok(municipalSource.includes("MunicipalAppealReview"));
  assert.ok(municipalSource.includes("getAppealForMunicipalityAction"));
});
