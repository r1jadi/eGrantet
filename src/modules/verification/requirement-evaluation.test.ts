import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateDocumentRequirement,
  evaluateRequirementDeterministically,
  evaluateRequirementWithDocumentEvidence,
  type RequirementEvaluationContext,
} from "./requirement-evaluation";

function makeContext(overrides: Partial<RequirementEvaluationContext> = {}): RequirementEvaluationContext {
  return {
    requirement: { id: "req-1", name: "Test requirement", type: "OTHER", isRequired: true, configuration: {} },
    answers: {},
    applicationDate: new Date("2026-09-26T10:00:00.000Z"),
    grantMaximumAmount: 10_000,
    requestedAmount: 5_000,
    currency: "EUR",
    documentAnalyses: [],
    ...overrides,
  };
}

test("FINANCIAL maximum amount: PASS under limit, FAIL over limit", () => {
  const pass = evaluateRequirementDeterministically(
    makeContext({ requestedAmount: 8_000, requirement: { id: "req-fin", name: "Max amount", type: "FINANCIAL", isRequired: true, configuration: {} } }),
  );
  assert.equal(pass?.result, "PASS");
  assert.equal(pass?.source, "DETERMINISTIC");
  assert.equal(pass?.evidence[0]?.source, "APPLICATION_DATA");

  const fail = evaluateRequirementDeterministically(
    makeContext({ requestedAmount: 12_000, requirement: { id: "req-fin", name: "Max amount", type: "FINANCIAL", isRequired: true, configuration: {} } }),
  );
  assert.equal(fail?.result, "FAIL");
  assert.match(fail?.explanation ?? "", /exceeds/);
});

test("FINANCIAL without amounts is NOT_VERIFIABLE, never invented", () => {
  const result = evaluateRequirementDeterministically(
    makeContext({ requestedAmount: null, grantMaximumAmount: null, requirement: { id: "req-fin", name: "Max amount", type: "FINANCIAL", isRequired: true, configuration: {} } }),
  );
  assert.equal(result?.result, "NOT_VERIFIABLE");
});

test("expected-answer equality is deterministic and case-insensitive", () => {
  const context = makeContext({
    requirement: { id: "req-2", name: "Registered in Gjakova", type: "APPLICANT", isRequired: true, configuration: { answerKey: "municipality", expectedAnswer: "Gjakova" } },
    answers: { municipality: "gjakova" },
  });
  const result = evaluateRequirementDeterministically(context);
  assert.equal(result?.result, "PASS");

  const failing = evaluateRequirementDeterministically({
    ...context,
    answers: { municipality: "Prishtina" },
  });
  assert.equal(failing?.result, "FAIL");
  assert.match(failing?.explanation ?? "", /does not match/);
});

test("minimum-years duration rule uses the application date deterministically", () => {
  const context = makeContext({
    requirement: { id: "req-3", name: "Business older than 1 year", type: "ELIGIBILITY", isRequired: true, configuration: { answerKey: "yearEstablished", minimumYears: 1 } },
    answers: { yearEstablished: "2024-05-14" },
  });
  const passed = evaluateRequirementDeterministically(context);
  assert.equal(passed?.result, "PASS");

  const recent = evaluateRequirementDeterministically({ ...context, answers: { yearEstablished: "2026-06-01" } });
  assert.equal(recent?.result, "FAIL");
  assert.match(recent?.explanation ?? "", /less than 1/);

  const noDate = evaluateRequirementDeterministically({ ...context, answers: {} });
  assert.equal(noDate?.result, "NEEDS_REVIEW");
});

test("presence rule fails when a required answer is missing", () => {
  const context = makeContext({
    requirement: { id: "req-4", name: "Project title provided", type: "PROJECT", isRequired: true, configuration: { answerKey: "projectTitle" } },
    answers: {},
  });
  const result = evaluateRequirementDeterministically(context);
  assert.equal(result?.result, "FAIL");
});

test("returns null when no deterministic rule applies (AI evidence may follow)", () => {
  const result = evaluateRequirementDeterministically(makeContext({ requirement: { id: "req-5", name: "Free-form", type: "OTHER", isRequired: true, configuration: {} } }));
  assert.equal(result, null);
});

test("AI never overrides deterministic eligibility: evidence-only fallback stays NEEDS_REVIEW", () => {
  const context = makeContext({
    requirement: { id: "req-6", name: "Business older than 1 year", type: "ELIGIBILITY", isRequired: true, configuration: {} },
    documentAnalyses: [
      {
        documentId: "doc-1",
        requirementId: "req-6",
        fileName: "certificate.pdf",
        status: "VERIFIED",
        extractedFields: [{ name: "registrationDate", value: "2024-05-14", sourceQuote: "Registered on 2024-05-14" }],
      },
    ],
  });
  const result = evaluateRequirementWithDocumentEvidence(context, {});
  assert.equal(result.source, "AI");
  assert.equal(result.result, "NEEDS_REVIEW");
  assert.ok(result.evidence.length > 0);
  assert.match(result.explanation, /reviewer must confirm/i);
});

test("evidence fallback without documents: FAIL-adjacent NEEDS_REVIEW for required, NOT_VERIFIABLE when optional", () => {
  const context = makeContext({ requirement: { id: "req-7", name: "Any rule", type: "ELIGIBILITY", isRequired: true, configuration: {} } });
  const required = evaluateRequirementWithDocumentEvidence(context, {});
  assert.equal(required.result, "NEEDS_REVIEW");

  const optional = evaluateRequirementWithDocumentEvidence({ ...context, requirement: { ...context.requirement, isRequired: false } }, {});
  assert.equal(optional.result, "NOT_VERIFIABLE");
});

test("DOCUMENT requirement passes only with a VERIFIED analysis", () => {
  const verified = makeContext({
    requirement: { id: "req-8", name: "Business certificate", type: "DOCUMENT", isRequired: true, configuration: {} },
    documentAnalyses: [{ documentId: "doc-2", requirementId: "req-8", fileName: "certificate.pdf", status: "VERIFIED", extractedFields: [] }],
  });
  assert.equal(evaluateDocumentRequirement(verified).result, "PASS");

  const unreadable = makeContext({
    requirement: { id: "req-8", name: "Business certificate", type: "DOCUMENT", isRequired: true, configuration: {} },
    documentAnalyses: [{ documentId: "doc-2", requirementId: "req-8", fileName: "scan.pdf", status: "UNREADABLE", extractedFields: [] }],
  });
  const unreadableResult = evaluateDocumentRequirement(unreadable);
  assert.equal(unreadableResult.result, "NEEDS_REVIEW");
  assert.match(unreadableResult.explanation, /could not be read/i);

  const missing = evaluateDocumentRequirement(makeContext({ requirement: { id: "req-8", name: "Business certificate", type: "DOCUMENT", isRequired: true, configuration: {} } }));
  assert.equal(missing.result, "FAIL");
  assert.match(missing.explanation, /No valid document supporting this requirement/i);
});
