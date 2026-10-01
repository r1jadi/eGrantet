import assert from "node:assert/strict";
import test from "node:test";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { matchReasonLabel, renderEmailTemplate, type ApplicationEmailVariables, type EmailTemplateKind, type EvaluationEmailVariables, type GrantEmailVariables, type MilestoneEmailVariables, type VerificationEmailVariables } from "./email-types";

/**
 * Localized email template tests.
 *
 * Every email introduced by the notification layer must render fully in
 * sq/en/sr without mixing languages, use honest "may be relevant" wording
 * (never eligibility claims), and keep match reasons explainable in the
 * user's language.
 */

const GRANT: GrantEmailVariables = {
  grantName: "Youth Business Development Grant",
  municipality: "Prishtina",
  deadline: "2026-10-15",
  fundingAmount: "10,000",
  fundingCurrency: "EUR",
  matchReasons: ["email.matchMunicipality", "email.matchApplicantType", "email.matchSector"],
  grantUrl: "https://example.com/grants/g1",
};

const APPLICATION: ApplicationEmailVariables = { status: "APPROVED", applicationUrl: "https://example.com/applications/a1", applicationReference: "APP-1" };
const MILESTONE: MilestoneEmailVariables = { milestone: "Prototype", status: "APPROVED", applicationUrl: "https://example.com/applications/a1" };
const EVALUATION: EvaluationEmailVariables = { applicationReference: "APP-1", evaluationUrl: "https://example.com/evaluator/applications/a1" };
const VERIFICATION: VerificationEmailVariables = { applicationReference: "APP-1", applicationUrl: "https://example.com/applications/a1" };

test("grant recommendation renders in all three locales without mixing languages", () => {
  const expectations: Record<Locale, { subjectIncludes: string[]; heading: string; cta: string; reasonMustInclude: string }> = {
    sq: { subjectIncludes: ["Një grant i ri mund të jetë zgjedhje e mirë për ju"], heading: "Një grant i ri mund të jetë zgjedhje e mirë për ju", cta: "Shiko grantin", reasonMustInclude: "Komuna" },
    en: { subjectIncludes: ["A new grant may be a good fit for you"], heading: "A new grant may be a good fit for you", cta: "View grant", reasonMustInclude: "municipality" },
    sr: { subjectIncludes: ["Novi grant može biti dobar izbor za vas"], heading: "Novi grant može biti dobar izbor za vas", cta: "Pogledaj grant", reasonMustInclude: "Opština" },
  };
  for (const locale of LOCALES) {
    const email = renderEmailTemplate(locale, "grant_recommendation", { locale, grant: GRANT });
    const expected = expectations[locale];
    for (const fragment of expected.subjectIncludes) assert.ok(email.subject.includes(fragment), `${locale} subject: ${email.subject}`);
    assert.equal(email.heading, expected.heading);
    assert.equal(email.ctaLabel, expected.cta);
    assert.equal(email.ctaUrl, GRANT.grantUrl);
    // Honest wording: recommendation, never an eligibility guarantee.
    assert.match(email.heading, /may|mund|može/);
    assert.ok(email.bodyLines.some((line) => line.includes(GRANT.grantName)));
    assert.ok(email.bodyLines.some((line) => line.includes("2026")));
    assert.ok(email.bullets.length === GRANT.matchReasons.length);
    assert.ok(email.bullets.some((bullet) => bullet.includes(expected.reasonMustInclude)));
    assert.ok(email.footerLines.length >= 2);
  }
});

test("deadline and funding appear when present and are omitted cleanly when absent", () => {
  const withData = renderEmailTemplate("en", "grant_recommendation", { locale: "en", grant: GRANT });
  assert.ok(withData.bodyLines.some((line) => line.includes("15 Oct 2026")));
  assert.ok(withData.bodyLines.some((line) => line.toLowerCase().includes("funding") || line.includes("Financim") || line.includes("Finansiranje")));

  const bare = renderEmailTemplate("en", "grant_recommendation", { locale: "en", grant: { ...GRANT, deadline: null, fundingAmount: null, fundingCurrency: null } });
  assert.ok(!bare.bodyLines.some((line) => line.includes("—") && line.toLowerCase().includes("deadline")));
  assert.ok(!bare.bodyLines.some((line) => line.toLowerCase().includes("funding") && line.includes("up to")));
});

test("unknown match reason keys pass through, known keys localize per locale", () => {
  assert.equal(matchReasonLabel("en", "email.matchSector"), "The focus area matches your profile");
  assert.equal(matchReasonLabel("sq", "email.matchSector"), "Fusha e fokusit përputhet me profilin tuaj");
  assert.equal(matchReasonLabel("sr", "email.matchFunding"), "Iznos finansiranja odgovara vašem opsegu");
  // An unknown reason renders as its key, never blank.
  assert.equal(matchReasonLabel("en", "email.matchUnknown"), "email.matchUnknown");
});

test("every non-grant template kind renders its own localized subject, CTA, and link", () => {
  const cases: Array<{ kind: EmailTemplateKind; context: Record<string, unknown> }> = [
    { kind: "application_status", context: { application: APPLICATION } },
    { kind: "decision", context: { application: APPLICATION } },
    { kind: "milestone", context: { milestone: MILESTONE } },
    { kind: "evaluation", context: { evaluation: EVALUATION } },
    { kind: "verification", context: { verification: VERIFICATION } },
  ];
  const subjects = new Set<string>();
  for (const locale of LOCALES) {
    for (const entry of cases) {
      const email = renderEmailTemplate(locale, entry.kind, { locale, ...entry.context } as Parameters<typeof renderEmailTemplate>[2]);
      assert.ok(email.subject.length > 0);
      assert.ok(email.ctaLabel.length > 0);
      assert.equal(email.ctaUrl.length > 0, true);
      subjects.add(`${entry.kind}:${email.subject}`);
      assert.ok(email.footerLines.length >= 2);
    }
  }
  // Decision/status share a status line but each kind has a distinct subject space.
  assert.ok(subjects.size >= LOCALES.length * 4);
});

test("status text is localized in the email body (never a raw enum)", () => {
  const en = renderEmailTemplate("en", "application_status", { locale: "en", application: { ...APPLICATION, status: "APPROVED" } });
  const sq = renderEmailTemplate("sq", "application_status", { locale: "sq", application: { ...APPLICATION, status: "APPROVED" } });
  const sr = renderEmailTemplate("sr", "application_status", { locale: "sr", application: { ...APPLICATION, status: "APPROVED" } });
  assert.ok(en.bodyLines[0].includes("Approved"));
  assert.ok(sq.bodyLines[0].includes("Aprovuar"));
  assert.ok(sr.bodyLines[0].includes("Odobreno"));
  for (const email of [en, sq, sr]) assert.ok(!email.bodyLines[0].includes("APPROVED"));
  // Unknown statuses degrade to the raw value instead of a blank template hole.
  const unknown = renderEmailTemplate("en", "application_status", { locale: "en", application: { ...APPLICATION, status: "WEIRD" } });
  assert.ok(unknown.bodyLines[0].includes("WEIRD"));
});

test("rendering throws a clear error when a template is missing its variables", () => {
  assert.throws(() => renderEmailTemplate("en", "grant_recommendation", { locale: "en" }), /missing its variables/);
  assert.throws(() => renderEmailTemplate("en", "milestone", { locale: "en" }), /missing its variables/);
});
