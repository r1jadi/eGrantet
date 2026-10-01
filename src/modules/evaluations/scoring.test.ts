import assert from "node:assert/strict";
import test from "node:test";
import {
  blindDocumentName,
  calculateTotalScore,
  isStaleEvaluation,
  redactAnswersForBlindPhase,
  resolveStoredTotal,
  scoreAutomaticCriterion,
  validateEvaluationScores,
  type ScoringCriterion,
} from "./scoring";

function criterion(overrides: Partial<ScoringCriterion> = {}): ScoringCriterion {
  return {
    id: "c1",
    name: "Project quality",
    maximumScore: 10,
    displayOrder: 0,
    isActive: true,
    scoringMode: "MANUAL",
    autoConfig: null,
    ...overrides,
  };
}

test("automatic criterion scores full points on a configured matching value", () => {
  const auto = criterion({
    scoringMode: "AUTOMATIC",
    maximumScore: 5,
    autoConfig: { answerKey: "businessType", matchingValues: ["women-owned"], fallbackScore: 0 },
  });
  assert.equal(scoreAutomaticCriterion(auto, { businessType: "women-owned" }), 5);
  assert.equal(scoreAutomaticCriterion(auto, { businessType: "Women-Owned" }), 5);
});

test("automatic criterion scores the fallback (clamped) when nothing matches", () => {
  const auto = criterion({
    scoringMode: "AUTOMATIC",
    maximumScore: 5,
    autoConfig: { answerKey: "businessType", matchingValues: ["women-owned"], fallbackScore: 2 },
  });
  assert.equal(scoreAutomaticCriterion(auto, { businessType: "other" }), 2);
  assert.equal(scoreAutomaticCriterion(auto, {}), 2);
  const over = criterion({ scoringMode: "AUTOMATIC", maximumScore: 5, autoConfig: { answerKey: "x", matchingValues: ["a"], fallbackScore: 99 } });
  assert.equal(scoreAutomaticCriterion(over, {}), 5);
  const noConfig = criterion({ scoringMode: "AUTOMATIC", autoConfig: null });
  assert.equal(scoreAutomaticCriterion(noConfig, { x: "a" }), 0);
});

test("automatic scoring handles boolean and numeric answers deterministically", () => {
  const bool = criterion({ scoringMode: "AUTOMATIC", maximumScore: 3, autoConfig: { answerKey: "isStartup", matchingValues: ["true"] } });
  assert.equal(scoreAutomaticCriterion(bool, { isStartup: true }), 3);
  assert.equal(scoreAutomaticCriterion(bool, { isStartup: false }), 0);
  const numeric = criterion({ scoringMode: "AUTOMATIC", maximumScore: 4, autoConfig: { answerKey: "targetIndustry", matchingValues: ["42"] } });
  assert.equal(scoreAutomaticCriterion(numeric, { targetIndustry: 42 }), 4);
});

test("validateEvaluationScores accepts in-range manual scores and rounds to 2 decimals", () => {
  const result = validateEvaluationScores([criterion()], { c1: "7.555" }, {});
  assert.deepEqual(result.errors, []);
  assert.equal(result.scores.c1, 7.56);
  assert.equal(result.complete, true);
});

test("validateEvaluationScores rejects out-of-range, non-numeric, and unknown criterion scores", () => {
  const over = validateEvaluationScores([criterion()], { c1: "11" }, {});
  assert.match(over.errors.join(" "), /between 0 and 10/);
  const text = validateEvaluationScores([criterion()], { c1: "lots" }, {});
  assert.match(text.errors.join(" "), /must be a number/);
  const unknown = validateEvaluationScores([criterion()], { "not-a-criterion": "5" }, {});
  assert.match(unknown.errors.join(" "), /Unknown or inactive criterion/);
});

test("validateEvaluationScores treats missing manual scores as incomplete with a warning", () => {
  const result = validateEvaluationScores([criterion({ id: "a" }), criterion({ id: "b" })], { a: "5" }, {});
  assert.equal(result.complete, false);
  assert.match(result.warnings.join(" "), /No score entered for/);
  assert.equal(result.scores.b, undefined);
});

test("validateEvaluationScores rejects scores for inactive criteria", () => {
  const result = validateEvaluationScores([criterion({ isActive: false })], { c1: "5" }, {});
  assert.match(result.errors.join(" "), /Unknown or inactive criterion/);
});

test("validateEvaluationScores computes automatic criteria server-side and overrides client values", () => {
  const auto = criterion({ id: "auto1", scoringMode: "AUTOMATIC", maximumScore: 5, autoConfig: { answerKey: "businessType", matchingValues: ["women-owned"] } });
  const result = validateEvaluationScores([auto, criterion({ id: "m1" })], { auto1: "999", m1: "3" }, { businessType: "women-owned" });
  assert.equal(result.scores.auto1, 5);
  assert.equal(result.scores.m1, 3);
  assert.equal(result.complete, true);
});

test("a grant with only automatic criteria is complete without manual input", () => {
  const auto = criterion({ id: "auto1", scoringMode: "AUTOMATIC", maximumScore: 5, autoConfig: { answerKey: "x", matchingValues: ["a"] } });
  const result = validateEvaluationScores([auto], {}, { x: "a" });
  assert.equal(result.complete, true);
  assert.equal(result.scores.auto1, 5);
});

test("total score is the deterministic sum of stored criterion scores", () => {
  assert.equal(calculateTotalScore({ a: 5, b: 3.5, c: 1.5 }), 10);
  assert.equal(calculateTotalScore({}), 0);
});

test("stored total is null while incomplete and rounded once complete", () => {
  assert.equal(resolveStoredTotal(9.999, false), null);
  assert.equal(resolveStoredTotal(9.999, true), 10);
});

test("blind redaction removes identifying answers and keeps project content", () => {
  const redacted = redactAnswersForBlindPhase({
    organisationName: "Identifying Org",
    contactName: "Jane Doe",
    contactEmail: "jane@example.org",
    registrationNumber: "12345",
    projectTitle: "Community gardens",
    projectDescription: "We will build gardens.",
    budgetAmount: "4200",
  });
  assert.deepEqual(Object.keys(redacted).sort(), ["budgetAmount", "projectDescription", "projectTitle"]);
});

test("blind document names hide original filenames", () => {
  assert.equal(blindDocumentName(0, "pdf"), "document-1.pdf");
  assert.equal(blindDocumentName(2, "pdf"), "document-3.pdf");
  assert.equal(blindDocumentName(0, "jane-doe-cv"), "document-1.doc");
  assert.equal(blindDocumentName(1, "PDF"), "document-2.pdf");
});

test("stale evaluation detection compares update timestamps", () => {
  assert.equal(isStaleEvaluation("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"), true);
  assert.equal(isStaleEvaluation("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"), false);
});
