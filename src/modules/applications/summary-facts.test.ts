import assert from "node:assert/strict";
import test from "node:test";
import { buildApplicationSummaryFacts, collectSummaryAnswers, hasUsableProjectData } from "./summary-facts";
import type { MunicipalApplicationDetail } from "./types";

function detailFixture(overrides: Partial<MunicipalApplicationDetail> = {}): MunicipalApplicationDetail {
  return {
    id: "a1234567-0000-0000-0000-000000000000",
    status: "SUBMITTED",
    submittedAt: "2026-09-25T10:00:00.000Z",
    createdAt: "2026-09-24T09:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    answers: {
      projectTitle: "Pocket gardens for shared streets",
      projectDescription: "We will convert three unused courtyards into community gardens maintained by residents.",
      contactName: "Lilla Szabó",
      contactEmail: "lilla@example.org",
    },
    grant: {
      id: "g0000000-0000-0000-0000-000000000000",
      title: "Green Neighbourhoods Fund",
      fundingAmount: 5000,
      fundingCurrency: "EUR",
      applicationDeadline: "2026-10-31",
      status: "PUBLISHED",
    },
    applicant: {
      id: "u0000000-0000-0000-0000-000000000000",
      fullName: "Lilla Szabó",
      organisation: "District XIII Community Association",
      email: "lilla@example.org",
    },
    ...overrides,
  };
}

test("facts builder collects only string answers, trimmed and capped", () => {
  const answers = collectSummaryAnswers({ a: "  spaced  ", b: 42, c: "   ", d: "x".repeat(3_000) });
  assert.equal(answers.a, "spaced");
  assert.equal(answers.b, undefined);
  assert.equal(answers.c, undefined);
  assert.equal(answers.d.length, 2_000);
});

test("hasUsableProjectData requires project substance, not contact metadata", () => {
  assert.equal(hasUsableProjectData({ contactName: "Someone", contactEmail: "x@y.z" }), false);
  assert.equal(hasUsableProjectData({ projectTitle: "A project" }), true);
  assert.equal(hasUsableProjectData({ budgetAmount: 1500 }), true);
  assert.equal(hasUsableProjectData({}), false);
});

test("facts builder derives amounts, names, and reference from the detail", () => {
  const facts = buildApplicationSummaryFacts(detailFixture());
  assert.equal(facts.grantTitle, "Green Neighbourhoods Fund");
  assert.equal(facts.reference, "A1234567");
  assert.equal(facts.applicantName, "Lilla Szabó");
  assert.equal(facts.organisationName, "District XIII Community Association");
  assert.equal(facts.requestedAmount?.amount, 5000);
  assert.equal(facts.requestedAmount?.currency, "EUR");
  assert.equal(facts.answers.projectTitle, "Pocket gardens for shared streets");
});

test("facts builder omits absent fields instead of inventing them", () => {
  const facts = buildApplicationSummaryFacts(
    detailFixture({
      answers: {},
      applicant: { id: "u0000000-0000-0000-0000-000000000000", fullName: null, organisation: null, email: null },
      grant: { id: "g0000000-0000-0000-0000-000000000000", title: "Fund", fundingAmount: null, fundingCurrency: null, applicationDeadline: null, status: "PUBLISHED" },
    }),
  );
  assert.equal(facts.applicantName, null);
  assert.equal(facts.organisationName, null);
  assert.equal(facts.requestedAmount, null);
  assert.deepEqual(facts.answers, {});
});
