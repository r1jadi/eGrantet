import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { translate } from "@/lib/i18n/translate";
import { resolveMobileMenuAuthState } from "./mobile-menu-auth-state";

const memberIdentity = { email: "user@example.org", fullName: "Test User", isBusiness: false };

test("mobile menu auth state: loading until the session resolves", () => {
  assert.equal(resolveMobileMenuAuthState(false, null), "loading");
  assert.equal(resolveMobileMenuAuthState(false, memberIdentity), "loading");
});

test("mobile menu auth state: guests get CTAs, members keep the header menu", () => {
  assert.equal(resolveMobileMenuAuthState(true, null), "guest");
  assert.equal(resolveMobileMenuAuthState(true, memberIdentity), "member");
});

test("nav.signUp is translated distinctly from sign-in in every locale", () => {
  assert.equal(translate("en", "nav.signUp"), "Sign up");
  assert.equal(translate("sq", "nav.signUp"), "Regjistrohu");
  assert.equal(translate("sr", "nav.signUp"), "Registruj se");
  for (const locale of ["en", "sq", "sr"] as const) {
    assert.notEqual(translate(locale, "nav.signUp"), translate(locale, "nav.signIn"));
    assert.ok(translate(locale, "nav.signUp").length > 0);
  }
});

test("mobile menu contains guest registration and sign-in links to real routes", async () => {
  const shell = await readFile(
    path.join(process.cwd(), "src", "modules", "grants", "components", "applicant-shell.tsx"),
    "utf8",
  );
  const menuAt = shell.indexOf('id="applicant-menu"');
  const usageAt = shell.indexOf("<MobileMenuAuthActions");
  assert.ok(menuAt >= 0, "mobile menu block must exist");
  assert.ok(shell.includes('href="/register"'), "mobile menu must link the registration route");
  assert.ok(shell.includes('href="/login"'), "mobile menu must link the sign-in route");
  assert.ok(usageAt > menuAt, "auth CTA component must render inside the mobile menu element");
  assert.ok(shell.includes("resolveMobileMenuAuthState"), "menu CTAs must be gated on session state");
  assert.ok(shell.includes("min-h-11"), "menu CTAs must meet the 44px touch target");

  // Both targets must be the application's real auth routes, not invented URLs.
  const registerPage = await readFile(path.join(process.cwd(), "src", "app", "register", "page.tsx"), "utf8");
  assert.ok(registerPage.includes('mode="register"'), "CTA target must be the real registration flow");
  const loginPage = await readFile(path.join(process.cwd(), "src", "app", "login", "page.tsx"), "utf8");
  assert.ok(loginPage.includes('mode="login"'), "sign-in target must be the real login flow");
});

test("homepage hero offers registration to guests only", async () => {
  const home = await readFile(path.join(process.cwd(), "src", "app", "page.tsx"), "utf8");
  assert.ok(home.includes('href="/register"'), "hero must link the real registration route");
  assert.ok(home.includes("getCurrentProfile"), "hero CTA must be gated on server-side auth state");
});
