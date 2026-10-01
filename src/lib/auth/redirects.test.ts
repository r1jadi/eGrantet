import assert from "node:assert/strict";
import test from "node:test";
import { decideRoute, getAuthenticatedLandingPath, isRoleAllowedInArea } from "./redirects";

test("administrators land in the dedicated admin area", () => {
  assert.equal(getAuthenticatedLandingPath("ADMIN"), "/admin");
});

test("only administrators may enter the dedicated admin route area", () => {
  assert.equal(isRoleAllowedInArea("ADMIN", "admin"), true);
  assert.equal(isRoleAllowedInArea("MUNICIPAL_EMPLOYEE", "admin"), false);
  assert.equal(isRoleAllowedInArea("APPLICANT", "admin"), false);
});

test("an administrator requesting the municipality area is redirected to the admin dashboard", () => {
  assert.deepEqual(
    decideRoute({
      pathname: "/municipality",
      search: "",
      isAuthenticated: true,
      role: "ADMIN",
      rawNext: null,
    }),
    { kind: "redirect", destination: "/admin" },
  );
});

test("an unauthenticated admin-route request is sent to login with a safe return path", () => {
  assert.deepEqual(
    decideRoute({
      pathname: "/admin",
      search: "?tab=overview",
      isAuthenticated: false,
      role: null,
      rawNext: null,
    }),
    { kind: "redirect", destination: "/login", next: "/admin?tab=overview" },
  );
});
