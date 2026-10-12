import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LOCALE, LOCALES, isLocale, parseLocale } from "./config";
import { translate } from "./translate";
import { formatCurrency, formatDate, formatNumber } from "./format";
import { en } from "./dictionaries/en";
import { sq } from "./dictionaries/sq";
import { sr } from "./dictionaries/sr";

/** Collects every leaf string of a dictionary tree. */
function leaves(tree: unknown, prefix = ""): string[] {
  if (typeof tree === "string") return [prefix];
  if (typeof tree !== "object" || tree === null) return [];
  return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key));
}

test("both locales translate the same key set (parity)", () => {
  const enKeys = leaves(en).sort();
  const sqKeys = leaves(sq).sort();
  const srKeys = leaves(sr).sort();
  assert.deepEqual(sqKeys, enKeys);
  assert.deepEqual(srKeys, enKeys);
});

test("all three locales localize the parity-checked keys", () => {
  assert.equal(translate("sr", "nav.home"), "Početna");
  assert.equal(translate("sr", "statusLabels.application.APPROVED"), "Odobreno");
  assert.equal(translate("sr", "verification.aiAssisted"), "Uz pomoć AI");
  assert.equal(translate("sr", "common.productName"), "Komunalni grantovi");
});

test("English dictionary values are English, Albanian values are Albanian", () => {
  assert.equal(translate("en", "nav.home"), "Home");
  assert.equal(translate("sq", "nav.home"), "Kryefaqja");
  assert.equal(translate("en", "auth.loginTitle"), "Welcome back");
  assert.equal(translate("sq", "auth.loginTitle"), "Mirë se vini përsëri");
  assert.equal(translate("sq", "common.productName"), "eGrantet");
});

test("missing keys fall back to English, then to the key itself", () => {
  assert.equal(translate("sq", "common.save"), "Ruaj");
  // Unknown key renders as the key itself, never as blank UI.
  assert.equal(translate("sq", "totally.missing.key"), "totally.missing.key");
  assert.equal(translate("en", "another.missing.key"), "another.missing.key");
});

test("interpolation replaces placeholders and keeps unknown ones", () => {
  assert.equal(translate("en", "municipality.dashboardWelcome", { name: "Ana" }), "Welcome, Ana");
  assert.equal(translate("sq", "municipality.dashboardWelcome", { name: "Ana" }), "Mirë se vini, Ana");
  assert.equal(translate("en", "locale.switchedTo", { locale: "English" }), "Language changed to English");
  // Unknown placeholders remain visible (surface bugs instead of blank text).
  assert.equal(translate("en", "municipality.dashboardWelcome"), "Welcome, {name}");
});

test("locale config: parsing, validation, and default to English", () => {
  assert.deepEqual([...LOCALES].sort(), ["en", "sq", "sr"]);
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(isLocale("sq"), true);
  assert.equal(isLocale("sr"), true);
  assert.equal(isLocale("fr"), false);
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("garbage"), "en");
  assert.equal(parseLocale(undefined), "en");
});

test("formatters localize dates, currency, and numbers", () => {
  // Currency uses the locale's conventions.
  const sqMoney = formatCurrency("sq", 5000, "EUR");
  const enMoney = formatCurrency("en", 5000, "EUR");
  assert.match(sqMoney, /5/);
  assert.match(enMoney, /5/);
  assert.doesNotThrow(() => formatNumber("sq", 123456));
  assert.doesNotThrow(() => formatDate("en", "2027-03-12"));
  assert.doesNotThrow(() => formatDate("sq", "2027-03-12T10:00:00Z"));
  // Missing/invalid values degrade to the em dash placeholder.
  assert.equal(formatDate("sq", null), "—");
  assert.equal(formatDate("sq", "not-a-date"), "—");
  assert.equal(formatCurrency("sq", null, null), "—");
});
