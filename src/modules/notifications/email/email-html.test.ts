import assert from "node:assert/strict";
import test from "node:test";
import { renderEmailHtml, renderEmailText } from "./email-html";
import { renderEmailTemplate } from "./email-types";

/**
 * HTML/text email renderer tests.
 *
 * Emails interpolate user-facing data (grant names, municipalities), so the
 * renderer must escape everything; the CTA must lead to the configured app
 * URL; and the plain-text fallback must carry the same content.
 */

function sampleEmail() {
  return renderEmailTemplate("en", "grant_recommendation", {
    locale: "en",
    grant: {
      grantName: "Youth Business Development Grant",
      municipality: "Prishtina",
      deadline: "2026-10-15",
      fundingAmount: "10,000",
      fundingCurrency: "EUR",
      matchReasons: ["email.matchMunicipality", "email.matchApplicantType"],
      grantUrl: "https://grants.example.com/grants/g1",
    },
  });
}

test("HTML escapes interpolated data so injection cannot break out of markup", () => {
  const malicious = renderEmailTemplate("en", "grant_recommendation", {
    locale: "en",
    grant: {
      grantName: '<script>alert("x")</script>',
      municipality: "Prishtina",
      deadline: "2026-10-15",
      fundingAmount: null,
      fundingCurrency: null,
      matchReasons: ["email.matchMunicipality"],
      grantUrl: "https://grants.example.com/grants/g1",
    },
  });
  const html = renderEmailHtml(malicious);
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&quot;x&quot;"));
});

test("HTML contains heading, body, bullets, styled CTA link, and footer", () => {
  const email = sampleEmail();
  const html = renderEmailHtml(email);
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("A new grant may be a good fit for you"));
  assert.ok(html.includes("Youth Business Development Grant"));
  assert.ok(html.includes("<li>The municipality matches your registration</li>"));
  assert.ok(html.includes("<li>Your applicant type matches</li>"));
  // Single primary CTA button pointing at the configured destination.
  const anchors = html.match(/<a /g) ?? [];
  assert.equal(anchors.length, 1);
  assert.ok(html.includes(`href="${email.ctaUrl}"`));
  assert.ok(html.includes(">View grant</a>"));
  assert.ok(html.includes("automated message"));
});

test("text fallback carries heading, bullets, CTA with full URL, and footer", () => {
  const email = sampleEmail();
  const text = renderEmailText(email);
  assert.ok(text.includes("A new grant may be a good fit for you"));
  assert.ok(text.includes("• The municipality matches your registration"));
  assert.ok(text.includes("View grant: https://grants.example.com/grants/g1"));
  assert.ok(text.includes("automated message"));
  assert.ok(!text.includes("<"));
});

test("emails without bullets omit the list markup entirely", () => {
  const email = renderEmailTemplate("en", "application_status", { locale: "en", application: { status: "SUBMITTED", applicationUrl: "https://grants.example.com/applications/a1", applicationReference: "APP-1" } });
  const html = renderEmailHtml(email);
  assert.ok(!html.includes("<ul"));
  assert.ok(html.includes(`href="https://grants.example.com/applications/a1"`));
});
