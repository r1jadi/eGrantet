import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale } from "./config";

/**
 * Language switching + persistence tests.
 *
 * The client store touches `document.cookie`/`localStorage`, so these tests
 * stub minimal browser globals on Node's globalThis, import the store fresh,
 * and verify: switching updates the snapshot + notifies subscribers, and the
 * choice is written to the cookie (the persistence the server reads).
 */

interface StoreModule {
  __testGetCurrentLocale: () => string;
  __testSubscribe: (listener: () => void) => () => void;
  __testSetLocale: (locale: "sq" | "en") => void;
}

interface StubResult {
  mod: StoreModule;
  cookies: Map<string, string>;
  storage: Map<string, string>;
}

async function loadStore(): Promise<StubResult> {
  const cookies = new Map<string, string>();
  const storage = new Map<string, string>();
  const documentStub = {
    get cookie(): string {
      return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    set cookie(value: string) {
      const [pair] = value.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    },
  };
  const windowStub = {};
  const localStorageStub = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  };
  const globalAny = globalThis as unknown as Record<string, unknown>;
  globalAny.document = documentStub;
  globalAny.window = windowStub;
  globalAny.localStorage = localStorageStub;
  // Node caches ESM; emulate a fresh module read via query-string import.
  const mod = await import(`./client.tsx?test=${Date.now()}-${Math.random()}`) as unknown as StoreModule;
  return { mod, cookies, storage };
}

test("provider-less store: default locale is English and switching persists to cookie", async () => {
  const { mod, cookies, storage } = await loadStore();
  const snapshot = mod.__testGetCurrentLocale();
  assert.equal(snapshot, DEFAULT_LOCALE);

  let notified = 0;
  const unsubscribe = mod.__testSubscribe(() => { notified += 1; });
  mod.__testSetLocale("sq");
  assert.equal(mod.__testGetCurrentLocale(), "sq");
  assert.equal(notified, 1);
  // Persisted for the server (cookie) and the browser (localStorage).
  assert.equal(cookies.get(LOCALE_COOKIE), "sq");
  assert.equal(storage.get(LOCALE_COOKIE), "sq");

  mod.__testSetLocale("en");
  assert.equal(mod.__testGetCurrentLocale(), "en");
  assert.equal(notified, 2);
  unsubscribe();
});

test("cookie value parses into the persisted locale", () => {
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("sq"), "sq");
  assert.equal(parseLocale("ja"), DEFAULT_LOCALE);
});
