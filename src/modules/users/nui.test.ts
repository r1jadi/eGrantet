import assert from "node:assert/strict";
import test from "node:test";
import { NuiValidationError, normalizeBusinessNui, requireValidBusinessNui } from "./nui";

/**
 * Canonical NUI normalization tests: every consumer (signup, profile lookup,
 * document lookup, uniqueness) must see the same canonical identity, and
 * invalid input must never normalize into a usable value.
 */

test("valid NUIs normalize to a trimmed upper-case canonical form", () => {
  assert.equal(normalizeBusinessNui("81023456"), "81023456");
  assert.equal(normalizeBusinessNui("  81023456  "), "81023456");
  assert.equal(normalizeBusinessNui("ab12cd34"), "AB12CD34");
  assert.equal(normalizeBusinessNui("ab12cd34"), normalizeBusinessNui(" AB12CD34 "));
});

test("missing or invalid NUI normalizes to null (never a usable identity)", () => {
  assert.equal(normalizeBusinessNui(null), null);
  assert.equal(normalizeBusinessNui(undefined), null);
  assert.equal(normalizeBusinessNui(""), null);
  assert.equal(normalizeBusinessNui("   "), null);
  assert.equal(normalizeBusinessNui("12345"), null); // too short
  assert.equal(normalizeBusinessNui("12345678901"), null); // too long
  assert.equal(normalizeBusinessNui("81023-456"), null); // punctuation
  assert.equal(normalizeBusinessNui("8102 3456"), null); // internal space
  assert.equal(normalizeBusinessNui("nuï2345"), null); // non-ASCII letters
});

test("boundary lengths 6 and 10 are accepted", () => {
  assert.equal(normalizeBusinessNui("123456"), "123456");
  assert.equal(normalizeBusinessNui("1234567890"), "1234567890");
});

test("requireValidBusinessNui returns the canonical form or a typed validation error", () => {
  assert.equal(requireValidBusinessNui(" 81023456 "), "81023456");
  try {
    requireValidBusinessNui("short");
    assert.fail("expected NuiValidationError");
  } catch (error) {
    assert.ok(error instanceof NuiValidationError);
    assert.ok(error.message.length > 0);
  }
  assert.throws(() => requireValidBusinessNui(null), NuiValidationError);
});
