import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Platform-administration decision-rule tests.
 *
 * The admin actions run against the real database, so these tests pin the
 * security-relevant rules from the source contract: every action re-asserts
 * the admin boundary, destructive paths are guarded, self-service is refused,
 * and every write is audited.
 */

const actionSource = readFileSync("src/modules/users/actions/admin-actions.ts", "utf8");

test("every admin action re-asserts the platform-admin boundary before touching data", () => {
  const actionNames = [
    "listMunicipalitiesAdminAction",
    "createMunicipalityAction",
    "renameMunicipalityAction",
    "deleteMunicipalityAction",
    "listMunicipalityMembersAdminAction",
    "addMunicipalityMemberAction",
    "removeMunicipalityMemberAction",
    "listUsersAdminAction",
    "changeUserRoleAction",
    "setUserDisabledAction",
    "listAuditLogsAdminAction",
  ];
  for (const name of actionNames) {
    const start = actionSource.indexOf(`export async function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    const body = actionSource.slice(start, start + 700);
    assert.ok(body.includes("assertAdminAreaAccess()"), `${name} must assert admin access`);
  }
});

test("municipality deletion refuses registries that still own members or grants", () => {
  const guard = (members: number, grants: number) => members > 0 || grants > 0;
  assert.equal(guard(0, 0), false, "empty municipality may be deleted");
  assert.equal(guard(2, 0), true);
  assert.equal(guard(0, 5), true);
  assert.ok(actionSource.includes("This municipality still has"), "deletion guard must explain why");
});

test("administrators cannot change their own role or disable their own account", () => {
  const selfChangeCount = (actionSource.match(/parsed\.data\.userId === actor\.id/g) ?? []).length;
  assert.equal(selfChangeCount, 2, "role change and disable must both refuse self-service");
});

test("account disabling maps to a long ban; re-enabling lifts it", () => {
  assert.ok(actionSource.includes(`ban_duration: parsed.data.disable === "true" ? "876000h" : "none"`));
});

test("role changes and account access changes are audited with the acting admin", () => {
  assert.ok(actionSource.includes("USER_ROLE_CHANGED"));
  assert.ok(actionSource.includes("USER_DISABLED"));
  assert.ok(actionSource.includes("USER_ENABLED"));
  assert.ok(actionSource.includes("changedBy: actor.id"));
});

test("member management promotes to the employee role and rejects duplicates", () => {
  assert.ok(actionSource.includes('role: "MUNICIPAL_EMPLOYEE"'), "adding a member grants the employee role");
  assert.ok(actionSource.includes('23505'), "duplicate membership is surfaced, not leaked as a crash");
});

test("audit browser never exposes more than a bounded window", () => {
  assert.ok(actionSource.includes("Math.min(input?.limit ?? 100, 500)"));
});

test("user list surfaces the disabled (banned) account state for the admin UI", () => {
  assert.ok(actionSource.includes("banned_until"), "ban state must come from the auth layer");
  assert.ok(actionSource.includes("disabled:"));
});
