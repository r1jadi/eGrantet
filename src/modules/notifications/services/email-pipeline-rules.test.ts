import assert from "node:assert/strict";
import test from "node:test";
import { ALWAYS_SEND_CATEGORIES, buildDedupKey, NOTIFICATION_CATEGORIES, resolveEmailLocale, shouldSendEmailForCategory, type NotificationCategory } from "./email-pipeline-rules";

/**
 * Pipeline rule tests: the gate that connects email delivery to notification
 * preferences, the dedup identity that prevents repeat sends, and locale
 * resolution that keeps web/in-app/email on one language.
 */

const ALL_ON: Record<NotificationCategory, boolean> = {
  grant_announcements: true,
  recommended_grants: true,
  application_updates: true,
  document_updates: true,
  verification_updates: true,
  evaluation_updates: true,
  decision_notifications: true,
  milestone_updates: true,
};

test("every category maps to a preference column and only decisions are always-on", () => {
  assert.equal(NOTIFICATION_CATEGORIES.length, 8);
  assert.deepEqual([...ALWAYS_SEND_CATEGORIES], ["decision_notifications"]);
  for (const category of NOTIFICATION_CATEGORIES) {
    const gated = shouldSendEmailForCategory(category, { ...ALL_ON, [category]: false });
    assert.equal(gated, category === "decision_notifications");
  }
});

test("disabled category prevents email, enabled category allows it", () => {
  assert.equal(shouldSendEmailForCategory("recommended_grants", { ...ALL_ON, recommended_grants: false }), false);
  assert.equal(shouldSendEmailForCategory("recommended_grants", { ...ALL_ON, recommended_grants: true }), true);
});

test("critical decision emails ignore the opt-out", () => {
  assert.equal(shouldSendEmailForCategory("decision_notifications", { ...ALL_ON, decision_notifications: false }), true);
});

test("missing preference defaults to no email (conservative gate)", () => {
  const partial = { ...ALL_ON, milestone_updates: undefined } as unknown as Record<NotificationCategory, boolean>;
  assert.equal(shouldSendEmailForCategory("milestone_updates", partial), false);
});

test("dedup key is deterministic per user + event + category", () => {
  assert.equal(buildDedupKey("user-1", "grant:g1:published:v1", "recommended_grants"), "user-1:grant:g1:published:v1:recommended_grants");
  assert.equal(buildDedupKey("user-1", "grant:g1:published:v1", "recommended_grants"), buildDedupKey("user-1", "grant:g1:published:v1", "recommended_grants"));
  assert.notEqual(buildDedupKey("user-1", "grant:g1:published:v1", "recommended_grants"), buildDedupKey("user-2", "grant:g1:published:v1", "recommended_grants"));
  assert.notEqual(buildDedupKey("user-1", "grant:g1:published:v1", "recommended_grants"), buildDedupKey("user-1", "grant:g2:published:v1", "recommended_grants"));
});

test("different categories on the same event never collide", () => {
  assert.notEqual(buildDedupKey("user-1", "application:a1:status:APPROVED", "application_updates"), buildDedupKey("user-1", "application:a1:status:APPROVED", "decision_notifications"));
});

test("email locale prefers the event locale, then the account language, then the default", () => {
  assert.equal(resolveEmailLocale("sq", "en"), "sq");
  assert.equal(resolveEmailLocale(null, "sr"), "sr");
  assert.equal(resolveEmailLocale(null, null), "en");
  assert.equal(resolveEmailLocale(undefined, "fr-CA"), "en");
  assert.equal(resolveEmailLocale("de", "sq"), "en");
});
