import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionLetterPrompt, parseDecisionLetterResponse, type DecisionLetterFacts } from "./decision-letter";

const baseFacts: DecisionLetterFacts = {
  decision: "ACCEPTANCE",
  grantTitle: "Green Neighbourhoods Fund",
  applicantName: "Lilla Szabó",
  organisationName: "District XIII Community Association",
  reference: "CG-2026-0147",
  submittedAt: "2026-09-25T10:00:00.000Z",
  reasons: [],
  positiveNotes: ["All required documents were received."],
  requestedAmount: { amount: 5000, currency: "EUR" },
};

test("acceptance prompt contains only trusted facts and the JSON contract", () => {
  const prompt = buildDecisionLetterPrompt(baseFacts);
  assert.ok(prompt.includes("Decision: ACCEPTANCE"));
  assert.ok(prompt.includes("Green Neighbourhoods Fund"));
  assert.ok(prompt.includes("Lilla Szabó"));
  assert.ok(prompt.includes("5000 EUR"));
  assert.ok(prompt.includes("All required documents were received."));
  assert.ok(prompt.includes('"subject"'));
  assert.ok(prompt.includes("Use ONLY the facts provided"));
});

test("rejection prompt requires and includes every verified reason", () => {
  const facts: DecisionLetterFacts = {
    ...baseFacts,
    decision: "REJECTION",
    reasons: ["Required document not provided: Registration certificate.", "Failed requirement: registered in District XIII."],
  };
  const prompt = buildDecisionLetterPrompt(facts);
  assert.ok(prompt.includes("rejected for exactly these verified reasons"));
  assert.ok(prompt.includes("Required document not provided: Registration certificate."));
  assert.ok(prompt.includes("Failed requirement: registered in District XIII."));
  assert.ok(prompt.includes("Do not add other reasons"));
});

test("rejection prompt without reasons is refused", () => {
  assert.throws(() => buildDecisionLetterPrompt({ ...baseFacts, decision: "REJECTION", reasons: [] }), /verified reason/);
});

test("parseDecisionLetterResponse accepts valid JSON and fenced JSON", () => {
  const valid = { subject: "Grant decision", body: "Dear applicant..." };
  assert.deepEqual(parseDecisionLetterResponse(JSON.stringify(valid)), valid);
  const fenced = "Here is the letter:\n```json\n" + JSON.stringify(valid) + "\n```";
  assert.deepEqual(parseDecisionLetterResponse(fenced), valid);
});

test("parseDecisionLetterResponse rejects malformed or misshapen responses", () => {
  assert.throws(() => parseDecisionLetterResponse("not json at all"));
  assert.throws(() => parseDecisionLetterResponse('{"subject": ""}'), /expected letter shape/);
  assert.throws(() => parseDecisionLetterResponse('{"subject": "s"}'), /expected letter shape/);
  assert.throws(() => parseDecisionLetterResponse('{"subject": 42, "body": "b"}'), /expected letter shape/);
});
