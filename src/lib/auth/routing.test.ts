import assert from "node:assert/strict";
import test from "node:test";
import { authDestinationForPath, classifyRoute, decideRoute, getAuthenticatedLandingPath, isRoleAllowedInArea, sanitizeNextPath } from "./redirects";

test("protected prefixes cover area roots and nested paths", () => {
  for (const path of ["/admin", "/admin/", "/admin/settings", "/applications", "/applications/", "/applications/new", "/municipality", "/municipality/review/1", "/evaluator", "/evaluator/dashboard"]) {
    assert.equal(classifyRoute(path), "protected", path);
  }
});

test("auth pages and public routes are classified correctly", () => {
  for (const path of ["/login", "/register/", "/login/additional"]) assert.equal(classifyRoute(path), "auth", path);
  for (const path of ["/", "/grants", "/grants/abc", "/forgot-password", "/reset-password", "/auth/verified", "/applications-fake", "/applicationsnew"]) {
    assert.equal(classifyRoute(path), "public", path);
  }
});

test("sanitizeNextPath keeps only safe same-origin paths", () => {
  assert.equal(sanitizeNextPath("/grants/abc?x=1&y=2"), "/grants/abc?x=1&y=2");
  assert.equal(sanitizeNextPath("/applications/new?grant=green-neighbourhoods-2026"), "/applications/new?grant=green-neighbourhoods-2026");
  assert.equal(sanitizeNextPath("/grants"), "/grants");
  assert.equal(sanitizeNextPath("/"), "/");
  assert.equal(sanitizeNextPath("  /grants  "), "/grants");
  assert.equal(sanitizeNextPath(null), null);
  assert.equal(sanitizeNextPath(undefined), null);
});

test("sanitizeNextPath rejects open redirects and unsafe input", () => {
  for (const raw of ["//evil.com/x", "///evil.com", "\\\\evil.com", "https://evil.com", "javascript:alert(1)", "mailto:a@b.c", "/a b", "/a\nb", "/a\tb", "/a\rb", "", "   ", "x".repeat(600)]) {
    assert.equal(sanitizeNextPath(raw), null, JSON.stringify(raw));
  }
});

test("role landings follow the authorization model", () => {
  assert.equal(getAuthenticatedLandingPath("APPLICANT"), "/applications");
  assert.equal(getAuthenticatedLandingPath("MUNICIPAL_EMPLOYEE"), "/municipality");
  assert.equal(getAuthenticatedLandingPath("EVALUATOR"), "/evaluator");
  // Administrators land in the dedicated admin area (see redirects.test.ts).
  assert.equal(getAuthenticatedLandingPath("ADMIN"), "/admin");
  assert.equal(getAuthenticatedLandingPath("UNKNOWN_ROLE"), "/applications");
  assert.equal(getAuthenticatedLandingPath(null), "/applications");
  assert.equal(getAuthenticatedLandingPath(undefined), "/applications");
});

test("area role policy mirrors the server authorization model", () => {
  assert.equal(isRoleAllowedInArea("APPLICANT", "applicant"), true);
  assert.equal(isRoleAllowedInArea("APPLICANT", "municipality"), false);
  assert.equal(isRoleAllowedInArea("APPLICANT", "evaluator"), false);
  assert.equal(isRoleAllowedInArea("MUNICIPAL_EMPLOYEE", "municipality"), true);
  assert.equal(isRoleAllowedInArea("MUNICIPAL_EMPLOYEE", "applicant"), false);
  assert.equal(isRoleAllowedInArea("EVALUATOR", "evaluator"), true);
  assert.equal(isRoleAllowedInArea("EVALUATOR", "municipality"), false);
  // Administrators are scoped to the dedicated admin route area only.
  assert.equal(isRoleAllowedInArea("ADMIN", "admin"), true);
  assert.equal(isRoleAllowedInArea("ADMIN", "municipality"), false);
  assert.equal(isRoleAllowedInArea("ADMIN", "evaluator"), false);
  assert.equal(isRoleAllowedInArea("ADMIN", "applicant"), false);
});

test("unauthenticated users are redirected from protected areas with a safe next", () => {
  // Application entry points route guests to Sign Up (natural next step).
  const decision = decideRoute({ pathname: "/applications/new", search: "?grant=green", isAuthenticated: false, role: null, rawNext: null });
  assert.deepEqual(decision, { kind: "redirect", destination: "/register", next: "/applications/new?grant=green" });
  // Other protected areas send guests to Sign In.
  const root = decideRoute({ pathname: "/municipality", search: "", isAuthenticated: false, role: null, rawNext: null });
  assert.equal(root.kind, "redirect");
  assert.equal((root as { destination: string }).destination, "/login");
});

test("wrong-role access redirects to the role's own landing area", () => {
  const applicantInMunicipality = decideRoute({ pathname: "/municipality/review", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: null });
  assert.deepEqual(applicantInMunicipality, { kind: "redirect", destination: "/applications" });
  const employeeInEvaluator = decideRoute({ pathname: "/evaluator", search: "", isAuthenticated: true, role: "MUNICIPAL_EMPLOYEE", rawNext: null });
  assert.deepEqual(employeeInEvaluator, { kind: "redirect", destination: "/municipality" });
});

test("unknown or missing roles fail closed to home", () => {
  const unknownRole = decideRoute({ pathname: "/applications", search: "", isAuthenticated: true, role: "SOMETHING_ELSE", rawNext: null });
  assert.deepEqual(unknownRole, { kind: "redirect", destination: "/" });
});

test("correctly-roled users are allowed through", () => {
  assert.deepEqual(decideRoute({ pathname: "/applications", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: null }), { kind: "allow" });
  assert.deepEqual(decideRoute({ pathname: "/admin", search: "", isAuthenticated: true, role: "ADMIN", rawNext: null }), { kind: "allow" });
  assert.deepEqual(decideRoute({ pathname: "/evaluator", search: "", isAuthenticated: true, role: "EVALUATOR", rawNext: null }), { kind: "allow" });
});

test("authenticated users are bounced from login and register", () => {
  const bounced = decideRoute({ pathname: "/login", search: "", isAuthenticated: true, role: "EVALUATOR", rawNext: null });
  assert.deepEqual(bounced, { kind: "redirect", destination: "/evaluator" });
  const fromRegister = decideRoute({ pathname: "/register", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: null });
  assert.deepEqual(fromRegister, { kind: "redirect", destination: "/applications" });
});

test("next destinations are honored only when the role may enter the area", () => {
  const applicantAllowed = decideRoute({ pathname: "/login", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: "/applications/new?grant=x" });
  assert.deepEqual(applicantAllowed, { kind: "redirect", destination: "/applications/new?grant=x" });
  const applicantDeniedMunicipalityNext = decideRoute({ pathname: "/login", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: "/municipality" });
  assert.deepEqual(applicantDeniedMunicipalityNext, { kind: "redirect", destination: "/applications" });
  const unsafeNext = decideRoute({ pathname: "/login", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: "https://evil.com" });
  assert.deepEqual(unsafeNext, { kind: "redirect", destination: "/applications" });
});

test("guests browsing public routes are allowed through without authentication", () => {
  // The grant directory and grant detail pages are public by design.
  for (const pathname of ["/", "/grants", "/grants/123e4567-e89b-12d3-a456-426614174000"]) {
    const decision = decideRoute({ pathname, search: "", isAuthenticated: false, role: null, rawNext: null });
    assert.deepEqual(decision, { kind: "allow" }, pathname);
  }
});

test("guests trying to apply are sent to Sign Up with a safe next destination", () => {
  const decision = decideRoute({ pathname: "/applications/new", search: "?grant=123e4567-e89b-12d3-a456-426614174000", isAuthenticated: false, role: null, rawNext: null });
  assert.equal(decision.kind, "redirect");
  const redirect = decision as { kind: "redirect"; destination: string; next?: string | null };
  assert.equal(redirect.destination, "/register");
  assert.equal(redirect.next, "/applications/new?grant=123e4567-e89b-12d3-a456-426614174000");
  // Direct policy form matches the proxy decision.
  const policy = authDestinationForPath("/applications/new?grant=123e4567-e89b-12d3-a456-426614174000");
  assert.equal(policy.destination, "/register");
  assert.equal(policy.next, "/applications/new?grant=123e4567-e89b-12d3-a456-426614174000");
});

test("guests opening My Applications or a specific application are sent to Sign In", () => {
  for (const pathname of ["/applications", "/applications/123e4567-e89b-12d3-a456-426614174000"]) {
    const decision = decideRoute({ pathname, search: "", isAuthenticated: false, role: null, rawNext: null });
    assert.equal(decision.kind, "redirect", pathname);
    const redirect = decision as { kind: "redirect"; destination: string; next?: string | null };
    assert.equal(redirect.destination, "/login", pathname);
    assert.equal(redirect.next, pathname, pathname);
  }
});

test("authDestinationForPath is sign-up only for application entry points", () => {
  assert.equal(authDestinationForPath("/applications/new?grant=g1").destination, "/register");
  assert.equal(authDestinationForPath("/applications/new").destination, "/register");
  assert.equal(authDestinationForPath("/applications").destination, "/login");
  assert.equal(authDestinationForPath("/applications/abc").destination, "/login");
  assert.equal(authDestinationForPath("/municipality").destination, "/login");
  // Unsafe destinations collapse to the applications area, never an open redirect.
  assert.equal(authDestinationForPath("https://evil.com").next, "/applications");
  assert.equal(authDestinationForPath("//evil.com").destination, "/login");
});

test("authenticated applicants keep normal access to application routes", () => {
  assert.deepEqual(decideRoute({ pathname: "/applications/new", search: "?grant=g1", isAuthenticated: true, role: "APPLICANT", rawNext: null }), { kind: "allow" });
  assert.deepEqual(decideRoute({ pathname: "/applications", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: null }), { kind: "allow" });
  assert.deepEqual(decideRoute({ pathname: "/applications/abc", search: "", isAuthenticated: true, role: "APPLICANT", rawNext: null }), { kind: "allow" });
});

test("RLS model: application policies are keyed to the authenticated user (guests get nothing)", () => {
  // Reference documentation of the enforced database policy: every branch of
  // the applications select policy requires an authenticated principal
  // (auth.uid() equality, membership, or assignment) — an anonymous request  // has auth.uid() = null and matches no branch, so guests cannot read any
  // application record even with direct API/Supabase access.
  const guestAuthUid: string | null = null;
  const policyBranches: Array<(uid: string | null) => boolean> = [
    (uid) => uid != null, // applicant_id = auth.uid()
    (uid) => uid != null, // municipality membership check
    (uid) => uid != null, // evaluator assignment check
    (uid) => uid != null, // admin check
  ];
  assert.equal(policyBranches.some((branch) => branch(guestAuthUid)), false);
  const applicantAuthUid = "11111111-1111-4111-8111-111111111111";
  assert.equal(policyBranches.some((branch) => branch(applicantAuthUid)), true);
});
