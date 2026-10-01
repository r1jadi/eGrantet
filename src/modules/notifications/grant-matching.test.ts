import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MATCH_THRESHOLD, getMatchThreshold, isRelevantMatch, scoreGrantForProfile, type ApplicantProfile, type GrantMatchInput } from "./grant-matching";

/**
 * Deterministic grant-relevance matching tests.
 *
 * Matching is NOT eligibility: these tests pin the explainable scoring
 * contract (threshold gate, per-dimension reasons, no-reason = no email) that
 * decides who may receive a personalized "may be relevant" notification.
 */

function grant(overrides: Partial<GrantMatchInput> = {}): GrantMatchInput {
  return {
    grantId: "grant-1",
    grantTitle: "Youth Business Development Grant",
    municipalityId: "municipality-1",
    municipalityName: "Prishtina",
    fundingAmount: 10_000,
    requirementKeywords: ["youth entrepreneurship support for small business"],
    ...overrides,
  };
}

function profile(overrides: Partial<ApplicantProfile> = {}): ApplicantProfile {
  return {
    municipalityName: "Prishtina",
    applicantType: "business",
    sectorKeywords: ["youth"],
    typicalFundingAmount: 8_000,
    ...overrides,
  };
}

test("perfect alignment scores every dimension and always includes reasons", () => {
  const match = scoreGrantForProfile(grant({ requirementKeywords: ["youth entrepreneurship support for small business", "environment"] }), profile({ sectorKeywords: ["youth", "environment"] }));
  assert.equal(match.score, 100);
  assert.deepEqual([...match.reasons].sort(), ["email.matchApplicantType", "email.matchFunding", "email.matchMunicipality", "email.matchSector"]);
});

test("municipality alignment is worth 40 points", () => {
  const match = scoreGrantForProfile(grant(), profile({ applicantType: null, sectorKeywords: [], typicalFundingAmount: null }));
  assert.equal(match.score, 40);
  assert.deepEqual(match.reasons, ["email.matchMunicipality"]);
});

test("applicant type matches through synonyms against the grant focus", () => {
  const match = scoreGrantForProfile(grant(), profile({ municipalityName: null, applicantType: "business", sectorKeywords: [], typicalFundingAmount: null }));
  assert.equal(match.score, 30);
  assert.deepEqual(match.reasons, ["email.matchApplicantType"]);
});

test("sector keywords contribute 10 per hit capped at 20", () => {
  const wide = grant({ requirementKeywords: ["youth entrepreneurship", "environment", "education"] });
  const single = scoreGrantForProfile(wide, profile({ municipalityName: null, applicantType: null, sectorKeywords: ["youth"], typicalFundingAmount: null }));
  assert.equal(single.score, 10);
  const capped = scoreGrantForProfile(wide, profile({ municipalityName: null, applicantType: null, sectorKeywords: ["youth", "environment", "education"], typicalFundingAmount: null }));
  assert.equal(capped.score, 20);
});

test("funding ratio between 0.5x and 2x scores 10, outside does not", () => {
  const inRange = scoreGrantForProfile(grant(), profile({ municipalityName: null, applicantType: null, sectorKeywords: [], typicalFundingAmount: 8_000 }));
  assert.equal(inRange.score, 10);
  assert.deepEqual(inRange.reasons, ["email.matchFunding"]);
  const outOfRange = scoreGrantForProfile(grant({ fundingAmount: 100_000 }), profile({ municipalityName: null, applicantType: null, sectorKeywords: [], typicalFundingAmount: 8_000 }));
  assert.equal(outOfRange.score, 0);
  assert.deepEqual(outOfRange.reasons, []);
});

test("insufficient profile information yields score 0 with no reasons (no email)", () => {
  const match = scoreGrantForProfile(grant(), profile({ municipalityName: null, applicantType: null, sectorKeywords: [], typicalFundingAmount: null }));
  assert.equal(match.score, 0);
  assert.deepEqual(match.reasons, []);
  assert.equal(isRelevantMatch(match), false);
});

test("matching is case/punctuation insensitive", () => {
  const match = scoreGrantForProfile(grant(), profile({ municipalityName: "  PRISHTINA! " }));
  assert.equal(match.reasons.includes("email.matchMunicipality"), true);
});

test("default threshold is 60 and a threshold-clearing match is relevant", () => {
  assert.equal(DEFAULT_MATCH_THRESHOLD, 60);
  const match = scoreGrantForProfile(grant(), profile({ sectorKeywords: [], typicalFundingAmount: null })); // 40 + 30 = 70
  assert.equal(match.score, 70);
  assert.equal(isRelevantMatch(match), true);
});

test("below-threshold matches are not relevant even with reasons", () => {
  const match = scoreGrantForProfile(grant(), profile({ applicantType: null, sectorKeywords: [], typicalFundingAmount: 8_000 })); // 40 + 10 = 50
  assert.equal(match.score, 50);
  assert.equal(isRelevantMatch(match), false);
});

test("a score at or above threshold without reasons is still irrelevant", () => {
  assert.equal(isRelevantMatch({ grantId: "g", score: 90, reasons: [] }), false);
});

test("threshold is configurable via GRANT_MATCH_THRESHOLD", () => {
  const original = process.env.GRANT_MATCH_THRESHOLD;
  try {
    process.env.GRANT_MATCH_THRESHOLD = "50";
    assert.equal(getMatchThreshold(), 50);
    process.env.GRANT_MATCH_THRESHOLD = "500";
    assert.equal(getMatchThreshold(), DEFAULT_MATCH_THRESHOLD);
    process.env.GRANT_MATCH_THRESHOLD = "abc";
    assert.equal(getMatchThreshold(), DEFAULT_MATCH_THRESHOLD);
    delete process.env.GRANT_MATCH_THRESHOLD;
    assert.equal(getMatchThreshold(), DEFAULT_MATCH_THRESHOLD);
  } finally {
    if (original === undefined) delete process.env.GRANT_MATCH_THRESHOLD;
    else process.env.GRANT_MATCH_THRESHOLD = original;
  }
});

test("custom threshold parameter overrides the environment default", () => {
  const match = scoreGrantForProfile(grant(), profile({ applicantType: null, sectorKeywords: [], typicalFundingAmount: 8_000 })); // 50
  assert.equal(isRelevantMatch(match, 50), true);
  assert.equal(isRelevantMatch(match, 51), false);
});
