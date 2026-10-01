import assert from "node:assert/strict";
import test from "node:test";
import { compareApplicationWithDocument, collectInconsistencies, normalizeComparableValue } from "./consistency";
import { detectMissingDocuments } from "./missing-documents";

test("normalizeComparableValue strips currency, spacing, and SH.P.K. variants", () => {
  assert.equal(normalizeComparableValue("ABC SH.P.K."), normalizeComparableValue("abc shpk"));
  assert.equal(normalizeComparableValue("€8,000"), normalizeComparableValue("8000"));
  assert.equal(normalizeComparableValue(" 9 500 $ "), "9500");
});

test("matching information classifies as CONSISTENT", () => {
  const checks = compareApplicationWithDocument(
    { organisationName: "ABC SH.P.K." },
    [{ name: "businessName", value: "ABC SH.P.K." }],
    "certificate.pdf",
  );
  assert.equal(checks.length, 1);
  assert.equal(checks[0]?.outcome, "CONSISTENT");
});

test("conflicting amounts produce CONFLICTING and land in the inconsistency list", () => {
  const checks = compareApplicationWithDocument(
    { budgetAmount: "8000" },
    [{ name: "totalAmount", value: "9500" }],
    "budget.pdf",
  );
  assert.equal(checks[0]?.outcome, "CONFLICTING");
  const inconsistencies = collectInconsistencies(checks);
  assert.equal(inconsistencies.length, 1);
  assert.match(inconsistencies[0]?.note ?? "", /differs/);
});

test("missing information on either side is reported, never compared", () => {
  const documentOnly = compareApplicationWithDocument({}, [{ name: "projectTitle", value: "Gardens" }], "plan.pdf");
  assert.equal(documentOnly[0]?.outcome, "MISSING_APPLICATION");

  const applicationOnly = compareApplicationWithDocument({ contactName: "Lilla" }, [], "plan.pdf");
  assert.equal(applicationOnly[0]?.outcome, "MISSING_DOCUMENT");

  // Neither side has anything comparable: no fabricated checks.
  const empty = compareApplicationWithDocument({}, [], "plan.pdf");
  assert.equal(empty.length, 0);
});

test("only genuinely comparable fields emit checks", () => {
  const checks = compareApplicationWithDocument(
    { organisationName: "ABC", unrelatedAnswer: "hello" },
    [{ name: "businessName", value: "ABC" }, { name: "somethingElse", value: "x" }],
    "certificate.pdf",
  );
  assert.equal(checks.length, 1);
  assert.equal(checks[0]?.field, "organisationName");
});

test("detectMissingDocuments flags only required DOCUMENT requirements without an uploaded file", () => {
  const requirements = [
    { id: "req-cert", name: "Business certificate", type: "DOCUMENT", isRequired: true },
    { id: "req-tax", name: "Tax certificate", type: "DOCUMENT", isRequired: true },
    { id: "req-optional", name: "Reference letter", type: "DOCUMENT", isRequired: false },
    { id: "req-amount", name: "Max amount", type: "FINANCIAL", isRequired: true },
  ];
  const documents = [{ requirementId: "req-cert", status: "UPLOADED" }];
  const report = detectMissingDocuments(requirements, documents);
  assert.deepEqual(report.missingRequirementIds, ["req-tax"]);
  assert.deepEqual(report.missingRequirementNames, ["Tax certificate"]);
});
