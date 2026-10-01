import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@/lib/errors/app-error";
import { assertAdminAllowlistAccess, isAdminEmail, isAllowedAdminAreaEmail, parseAdminEmails } from "./admin-allowlist";

const staffProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "MUNICIPAL_EMPLOYEE",
  email: "staff@municipality.example",
};

test("matching admin email is recognized", () => {
  const allowlist = parseAdminEmails("staff@municipality.example");
  assert.equal(isAdminEmail("staff@municipality.example", allowlist), true);
});

test("matching is case-insensitive on both sides", () => {
  const allowlist = parseAdminEmails("Platform.Admin@Example.COM");
  assert.equal(isAdminEmail("platform.admin@example.com", allowlist), true);
  assert.equal(isAdminEmail("PLATFORM.ADMIN@EXAMPLE.COM", allowlist), true);
  assert.equal(isAdminEmail("Platform.Admin@Example.COM", allowlist), true);
});

test("multiple comma-separated emails are parsed", () => {
  const allowlist = parseAdminEmails("a@city.gov,b@city.gov,c@city.gov");
  assert.deepEqual(allowlist, ["a@city.gov", "b@city.gov", "c@city.gov"]);
  assert.equal(isAdminEmail("b@city.gov", allowlist), true);
  assert.equal(isAdminEmail("d@city.gov", allowlist), false);
});

test("whitespace and empty entries are trimmed or ignored", () => {
  const allowlist = parseAdminEmails("  a@city.gov ,  , b@city.gov,   ");
  assert.deepEqual(allowlist, ["a@city.gov", "b@city.gov"]);
});

test("non-admin email is rejected", () => {
  const allowlist = parseAdminEmails("admin@city.gov");
  assert.equal(isAdminEmail("random@city.gov", allowlist), false);
  assert.equal(isAdminEmail(null, allowlist), false);
  assert.equal(isAdminEmail(undefined, allowlist), false);
  assert.equal(isAdminEmail("", allowlist), false);
});

test("missing or empty ADMIN_EMAILS parses to an empty allowlist", () => {
  assert.deepEqual(parseAdminEmails(undefined), []);
  assert.deepEqual(parseAdminEmails(null), []);
  assert.deepEqual(parseAdminEmails(""), []);
  assert.deepEqual(parseAdminEmails("   ,  , "), []);
});

test("missing/empty allowlist means nobody is a platform admin (fail closed)", () => {
  const allowlist = parseAdminEmails(undefined);
  assert.equal(isAdminEmail("admin@city.gov", allowlist), false);
  assert.throws(() => assertAdminAllowlistAccess(staffProfile, allowlist), AppError);
});

test("invalid allowlist entries are rejected instead of silently accepted", () => {
  assert.throws(() => parseAdminEmails("admin@city.gov,not-an-email"), AppError);
  assert.throws(() => parseAdminEmails("no-at-sign"), AppError);
});

test("hard gate accepts the allowlisted email and fails closed otherwise", () => {
  const allowlist = parseAdminEmails("Staff@Municipality.example");
  const allowed = assertAdminAllowlistAccess(staffProfile, allowlist);
  assert.equal(allowed.isPlatformAdmin, true);
  assert.equal(allowed.id, staffProfile.id);
  assert.throws(
    () => assertAdminAllowlistAccess({ ...staffProfile, email: "someone@else.example" }, allowlist),
    (error: unknown) => error instanceof AppError && error.code === "AUTHORIZATION",
  );
});

test("hard gate rejects unauthenticated subjects", () => {
  assert.throws(
    () => assertAdminAllowlistAccess(null, parseAdminEmails("staff@municipality.example")),
    (error: unknown) => error instanceof AppError && error.code === "AUTHENTICATION",
  );
});

test("area gate degrades to the role model when no allowlist is configured", () => {
  assert.equal(isAllowedAdminAreaEmail("anyone@city.gov", []), true);
  assert.equal(isAllowedAdminAreaEmail("staff@municipality.example", ["staff@municipality.example"]), true);
  assert.equal(isAllowedAdminAreaEmail("someone@else.example", ["staff@municipality.example"]), false);
});

test("unauthorized direct access: role check alone would admit this employee, the email gate denies them", () => {
  // Mirrors the (municipality) layout order: role gate first, then allowlist.
  const roleAllowsArea = ["MUNICIPAL_EMPLOYEE", "ADMIN"].includes(staffProfile.role);
  assert.equal(roleAllowsArea, true);
  const allowlist = parseAdminEmails("platform.admin@city.gov");
  assert.equal(isAllowedAdminAreaEmail(staffProfile.email, allowlist), false);
});

test("protected admin Server Action gate denies a non-allowlisted employee", () => {
  // Mirrors assertAdminAreaAccess's server-side decision (profile is loaded
  // server-side; the pure decision is exercised here).
  const allowlist = parseAdminEmails("platform.admin@city.gov");
  assert.equal(isAllowedAdminAreaEmail(staffProfile.email, allowlist), false);
  assert.equal(isAllowedAdminAreaEmail("PLATFORM.ADMIN@CITY.GOV", allowlist), true);
});
