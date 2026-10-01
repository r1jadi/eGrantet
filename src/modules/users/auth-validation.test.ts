import assert from "node:assert/strict";
import test from "node:test";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

const validSignUp = { email: " Applicant@Example.ORG ", fullName: "  Lilla Szabó  ", password: "correct horse battery", confirmPassword: "correct horse battery" };

test("signUp schema normalizes email and full name", () => {
  const parsed = signUpSchema.parse(validSignUp);
  assert.equal(parsed.email, "applicant@example.org");
  assert.equal(parsed.fullName, "Lilla Szabó");
});

test("signUp schema rejects mismatched and weak passwords", () => {
  assert.throws(() => signUpSchema.parse({ ...validSignUp, confirmPassword: "different" }));
  assert.throws(() => signUpSchema.parse({ ...validSignUp, password: "short", confirmPassword: "short" }));
  assert.throws(() => signUpSchema.parse({ ...validSignUp, fullName: "   " }));
});

test("signIn schema requires email and password", () => {
  assert.equal(signInSchema.parse({ email: " a@b.co ", password: "x" }).email, "a@b.co");
  assert.throws(() => signInSchema.parse({ email: "a@b.co", password: "" }));
  assert.throws(() => signInSchema.parse({ password: "x" }));
});

test("resetPassword schema enforces password rules and match", () => {
  assert.equal(resetPasswordSchema.parse({ password: "longenough1", confirmPassword: "longenough1" }).password, "longenough1");
  assert.throws(() => resetPasswordSchema.parse({ password: "longenough1", confirmPassword: "other" }));
  assert.throws(() => resetPasswordSchema.parse({ password: "short", confirmPassword: "short" }));
});

test("forgotPassword schema requires a valid email", () => {
  assert.equal(forgotPasswordSchema.parse({ email: " USER@Site.COM " }).email, "user@site.com");
  assert.throws(() => forgotPasswordSchema.parse({ email: "not-an-email" }));
});
