import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSENT_STORAGE_KEY,
  acceptAllConsent,
  customConsent,
  isValidConsent,
  loadConsent,
  parseConsent,
  rejectOptionalConsent,
  saveConsent,
  type ConsentPreferences,
} from "./consent";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    peek: (key: string) => store.get(key),
  };
}

test("accept-all enables preferences but never analytics", () => {
  const consent = acceptAllConsent(new Date("2026-01-01T00:00:00Z"));
  assert.equal(consent.essential, true);
  assert.equal(consent.preferences, true);
  assert.equal(consent.analytics, false);
  assert.ok(isValidConsent(consent));
});

test("reject-optional disables preferences and analytics", () => {
  const consent = rejectOptionalConsent(new Date("2026-01-01T00:00:00Z"));
  assert.equal(consent.essential, true);
  assert.equal(consent.preferences, false);
  assert.equal(consent.analytics, false);
  assert.ok(isValidConsent(consent));
});

test("custom consent honors the preferences toggle, analytics stays off", () => {
  assert.equal(customConsent(true).preferences, true);
  assert.equal(customConsent(false).preferences, false);
  assert.equal(customConsent(true).analytics, false);
});

test("parseConsent rejects garbage, wrong versions, and missing fields", () => {
  assert.equal(parseConsent(null), null);
  assert.equal(parseConsent(""), null);
  assert.equal(parseConsent("not-json{"), null);
  assert.equal(parseConsent(JSON.stringify({ hello: 1 })), null);
  assert.equal(
    parseConsent(JSON.stringify({ essential: true, preferences: true, analytics: false, version: 999, decidedAt: new Date().toISOString() })),
    null,
  );
  const valid: ConsentPreferences = acceptAllConsent();
  assert.deepEqual(parseConsent(JSON.stringify(valid)), valid);
});

test("consent round-trips through storage", () => {
  const storage = memoryStorage();
  assert.equal(loadConsent(storage), null);
  const consent = rejectOptionalConsent();
  assert.equal(saveConsent(storage, consent), true);
  assert.equal(storage.peek(CONSENT_STORAGE_KEY), JSON.stringify(consent));
  assert.deepEqual(loadConsent(storage), consent);
});

test("storage failure is reported, never silently claimed as saved", () => {
  const failing = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {
      throw new Error("quota exceeded");
    },
    removeItem: (_key: string) => {},
  };
  assert.equal(saveConsent(failing, acceptAllConsent()), false);
  assert.equal(loadConsent(failing), null);
});
