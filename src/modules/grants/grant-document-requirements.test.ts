import assert from "node:assert/strict";
import test from "node:test";
import { missingRequiredDocumentIds, resolveGrantDocumentRequirements, type RequirementLike } from "./grant-document-requirements";

/**
 * Grant-specific required-documents tests.
 *
 * The exact document list must come from the grant's configured requirements
 * (never hardcoded): DOCUMENT requirements map 1:1 to document slots with the
 * requirement's required/optional status, and submission is blocked only when
 * a required slot has no UPLOADED document attached to that exact id.
 */

function requirement(overrides: Partial<RequirementLike> & { id: string }): RequirementLike {
  return { name: `Requirement ${overrides.id}`, description: "", type: "OTHER", isRequired: true, ...overrides };
}

const configuredRequirements: RequirementLike[] = [
  requirement({ id: "reg-doc", name: "Registration certificate", description: "Official ARBK extract.", type: "DOCUMENT", isRequired: true }),
  requirement({ id: "status-doc", name: "Proof of active status", description: "Issued within the last 6 months.", type: "DOCUMENT", isRequired: true }),
  requirement({ id: "portfolio-doc", name: "Portfolio (optional)", description: "Past project examples.", type: "DOCUMENT", isRequired: false }),
  requirement({ id: "budget-answer", name: "Budget", description: "", type: "FINANCIAL", isRequired: true }),
  requirement({ id: "muni-answer", name: "Municipality", description: "", type: "ELIGIBILITY", isRequired: true }),
];

test("document list is derived from the grant's configured DOCUMENT requirements", () => {
  const documents = resolveGrantDocumentRequirements(configuredRequirements);
  assert.deepEqual(
    documents.map((document) => document.id),
    ["reg-doc", "status-doc", "portfolio-doc"],
  );
});

test("each document carries name, type, description, and required/optional status", () => {
  const documents = resolveGrantDocumentRequirements(configuredRequirements);
  assert.deepEqual(documents[0], { id: "reg-doc", name: "Registration certificate", type: "DOCUMENT", description: "Official ARBK extract.", isRequired: true });
  assert.deepEqual(documents[2], { id: "portfolio-doc", name: "Portfolio (optional)", type: "DOCUMENT", description: "Past project examples.", isRequired: false });
});

test("non-document requirements never appear in the document list", () => {
  const documents = resolveGrantDocumentRequirements(configuredRequirements);
  assert.ok(documents.every((document) => document.type === "DOCUMENT"));
  assert.ok(!documents.some((document) => ["budget-answer", "muni-answer"].includes(document.id)));
});

test("a grant with no DOCUMENT requirements yields an empty list (no hardcoded defaults)", () => {
  assert.deepEqual(resolveGrantDocumentRequirements([requirement({ id: "a", type: "ELIGIBILITY" })]), []);
  assert.deepEqual(resolveGrantDocumentRequirements([]), []);
});

test("submission is blocked while a required document slot is missing", () => {
  assert.deepEqual(missingRequiredDocumentIds(configuredRequirements, new Set(["reg-doc"])), ["status-doc"]);
  assert.deepEqual(missingRequiredDocumentIds(configuredRequirements, new Set()), ["reg-doc", "status-doc"]);
});

test("uploaded optional documents do not satisfy required slots or unblock submission", () => {
  // portfolio-doc uploaded but both required slots still missing.
  assert.deepEqual(missingRequiredDocumentIds(configuredRequirements, new Set(["portfolio-doc"])), ["reg-doc", "status-doc"]);
  // Only the required slots matter once satisfied; optional never blocks.
  assert.deepEqual(missingRequiredDocumentIds(configuredRequirements, new Set(["reg-doc", "status-doc", "portfolio-doc"])), []);
});

test("a document attached to the wrong requirement does not satisfy another", () => {
  assert.deepEqual(missingRequiredDocumentIds(configuredRequirements, new Set(["portfolio-doc", "reg-doc"])), ["status-doc"]);
});

test("optional-only document grants never block submission", () => {
  const optionalOnly = [requirement({ id: "opt", type: "DOCUMENT", isRequired: false })];
  assert.deepEqual(missingRequiredDocumentIds(optionalOnly, new Set()), []);
  assert.deepEqual(resolveGrantDocumentRequirements(optionalOnly)[0]?.isRequired, false);
});
