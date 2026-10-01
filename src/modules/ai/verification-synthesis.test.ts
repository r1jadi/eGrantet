import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVerificationSynthesisPrompt,
  countSynthesisSentences,
  parseVerificationSynthesisResponse,
} from "./verification-synthesis";

const validResult = {
  findings: [
    { severity: "WARNING", title: "Budget mismatch", detail: "The budget document shows a different total than the application." },
  ],
  summary:
    "The applicant requests support for a community garden project run by ABC SH.P.K. The submitted business certificate confirms registration in Gjakova. The project budget exceeds the requested amount and has been flagged for review. No required documents are missing.",
};

test("sentence counter counts 3-5 sentence summaries", () => {
  assert.equal(countSynthesisSentences("One. Two. Three."), 3);
  assert.equal(countSynthesisSentences("One. Two. Three. Four. Five."), 5);
});

test("valid synthesis response parses with findings and summary", () => {
  const parsed = parseVerificationSynthesisResponse(JSON.stringify(validResult));
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0]?.severity, "WARNING");
  assert.match(parsed.summary, /community garden/);
});

test("malformed synthesis responses are rejected", () => {
  assert.throws(() => parseVerificationSynthesisResponse("garbage"), /not valid JSON/i);
  assert.throws(() => parseVerificationSynthesisResponse(JSON.stringify({ findings: [] })), /shape/i);
  assert.throws(
    () => parseVerificationSynthesisResponse(JSON.stringify({ ...validResult, findings: [{ severity: "BLOCKER", title: "x", detail: "y" }] })),
    /shape/i,
  );
});

test("summaries outside the 3-5 sentence band are rejected", () => {
  const short = { findings: [], summary: "Only two sentences here. No third one." };
  assert.throws(() => parseVerificationSynthesisResponse(JSON.stringify(short)), /shape|sentences/i);
});

test("prompt declares deterministic results authoritative and forbids funding decisions", () => {
  const prompt = buildVerificationSynthesisPrompt({
    grantTitle: "Municipal Green Fund",
    requestedAmount: { amount: 8000, currency: "EUR" },
    submittedAt: "2026-09-26T10:00:00.000Z",
    deterministicResults: [{ requirement: "Registered in Gjakova", result: "PASSED", explanation: "Answer matches." }],
    documentResults: [{ fileName: "certificate.pdf", status: "VERIFIED", notes: "Legible.", inconsistencies: [] }],
    missingDocuments: ["Tax certificate"],
  });
  assert.match(prompt, /authoritative/i);
  assert.match(prompt, /Do not decide funding/i);
  assert.match(prompt, /\[PASSED\] Registered in Gjakova/);
  assert.match(prompt, /Tax certificate/);
  assert.match(prompt, /Respond with JSON only/);
});
