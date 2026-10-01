import assert from "node:assert/strict";
import test from "node:test";

/**
 * Deterministic rule mapping for the eligibility engine.
 *
 * The service wraps these rules in persistence; the rules themselves are the
 * security- and fairness-relevant part, so they are pinned here as a pure
 * reference implementation mirroring eligibility-service.ts.
 */

type Result = "PASSED" | "FAILED" | "PENDING";

interface RuleInput {
  type: string;
  isRequired: boolean;
  configuration: { answerKey?: string; expectedAnswer?: string; maximumValue?: number };
  answers: Record<string, unknown>;
  documentUploaded: boolean;
}

function evaluateRule(input: RuleInput): Result {
  const { type, isRequired, configuration, answers, documentUploaded } = input;
  if (type === "DOCUMENT") {
    return documentUploaded ? "PASSED" : isRequired ? "FAILED" : "PENDING";
  }
  if (typeof configuration.answerKey === "string" && configuration.answerKey.trim()) {
    const raw = answers[configuration.answerKey];
    const answer = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    if (answer === null) return isRequired ? "FAILED" : "PENDING";
    if (typeof configuration.expectedAnswer === "string" && configuration.expectedAnswer.trim()) {
      return answer.toLowerCase() === configuration.expectedAnswer.trim().toLowerCase() ? "PASSED" : "FAILED";
    }
    return "PASSED";
  }
  return "PENDING";
}

test("document requirement passes when uploaded, fails when required and missing", () => {
  assert.equal(evaluateRule({ type: "DOCUMENT", isRequired: true, configuration: {}, answers: {}, documentUploaded: true }), "PASSED");
  assert.equal(evaluateRule({ type: "DOCUMENT", isRequired: true, configuration: {}, answers: {}, documentUploaded: false }), "FAILED");
  assert.equal(evaluateRule({ type: "DOCUMENT", isRequired: false, configuration: {}, answers: {}, documentUploaded: false }), "PENDING");
});

test("expected-answer rules are deterministic and case-insensitive", () => {
  const base = { type: "APPLICANT", isRequired: true, documentUploaded: false };
  assert.equal(evaluateRule({ ...base, configuration: { answerKey: "municipality", expectedAnswer: "Gjakova" }, answers: { municipality: "gjakova" } }), "PASSED");
  assert.equal(evaluateRule({ ...base, configuration: { answerKey: "municipality", expectedAnswer: "Gjakova" }, answers: { municipality: "Prishtina" } }), "FAILED");
  assert.equal(evaluateRule({ ...base, configuration: { answerKey: "municipality", expectedAnswer: "Gjakova" }, answers: {} }), "FAILED");
});

test("optional rules without answers stay PENDING, never failed", () => {
  assert.equal(evaluateRule({ type: "PROJECT", isRequired: false, configuration: { answerKey: "summary" }, answers: {}, documentUploaded: false }), "PENDING");
});

test("rules without a configuration stay pending for human review", () => {
  assert.equal(evaluateRule({ type: "OTHER", isRequired: true, configuration: {}, answers: {}, documentUploaded: false }), "PENDING");
});
