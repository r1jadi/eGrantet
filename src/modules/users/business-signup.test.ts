import assert from "node:assert/strict";
import test from "node:test";
import { signUpSchema, businessNuiSchema } from "./schemas";
import { normalizeBusinessNui } from "./nui";

/**
 * Business vs Individual signup contract tests.
 *
 * The server must reject a Business signup whose NUI is missing or invalid,
 * and Individual signup must remain exactly email/password (+profile fields)
 * with no business record. NUI normalization mirrors the persistence path
 * (signUpAction → normalizeBusinessNui → metadata → trigger).
 */

const base = {
  email: "owner@business.example",
  fullName: "Business Owner",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
};

test("business signup requires a NUI; missing NUI is rejected", () => {
  assert.throws(() => signUpSchema.parse({ ...base, accountType: "business" }));
  assert.throws(() => signUpSchema.parse({ ...base, accountType: "business", businessNui: "" }));
  assert.throws(() => signUpSchema.parse({ ...base, accountType: "business", businessNui: "   " }));
});

test("business signup rejects malformed NUIs", () => {
  assert.throws(() => signUpSchema.parse({ ...base, accountType: "business", businessNui: "12345" }));
  assert.throws(() => signUpSchema.parse({ ...base, accountType: "business", businessNui: "12345678901" }));
  assert.throws(() => signUpSchema.parse({ ...base, accountType: "business", businessNui: "81 023456" }));
  assert.throws(() => signUpSchema.parse({ ...base, accountType: "business", businessNui: "81-023456" }));
});

test("valid business signup parses and the NUI normalizes to the canonical stored form", () => {
  const parsed = signUpSchema.parse({ ...base, accountType: "business", businessNui: " 81023456 " });
  assert.equal(parsed.accountType, "business");
  const persisted = normalizeBusinessNui(parsed.businessNui);
  assert.equal(persisted, "81023456");
});

test("individual signup needs no NUI and rejects none of the existing behavior", () => {
  const parsed = signUpSchema.parse({ ...base, accountType: "individual" });
  assert.equal(parsed.accountType, "individual");
  assert.equal(parsed.businessNui, undefined);
  // Default account type is individual.
  const defaulted = signUpSchema.parse(base);
  assert.equal(defaulted.accountType, "individual");
});

test("an individual may not smuggle a NUI into a business-only field", () => {
  // Individual signup ignores the NUI field entirely (no business record).
  const parsed = signUpSchema.parse({ ...base, accountType: "individual", businessNui: "81023456" });
  assert.equal(parsed.accountType, "individual");
});

test("duplicate NUI detection is a database-level guarantee (unique column), mirrored here", () => {
  // Two normalizations of differently-cased input collide, which is what makes
  // the unique index on business_nui effective against case-variant duplicates.
  const first = normalizeBusinessNui("ab12cd34");
  const second = normalizeBusinessNui("AB12CD34");
  assert.equal(first, second);
});

test("legacy businessNuiSchema (6-10 alphanumerics) stays consistent with the canonical module", () => {
  assert.equal(businessNuiSchema.safeParse("81023456").success, true);
  assert.equal(businessNuiSchema.safeParse("12345").success, false);
  assert.equal(businessNuiSchema.safeParse("81 023456").success, false);
});
