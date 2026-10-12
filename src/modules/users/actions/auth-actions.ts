"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
import { emailVerificationRedirect, passwordResetRedirect } from "@/lib/auth/env";
import { getAuthenticatedLandingPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { enforceRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "../schemas";
import { normalizeBusinessNui } from "../nui";

function mapAuthError(code: string | undefined, message: string): AppError {
  if (code === "invalid_credentials") return new AppError("AUTHENTICATION", "Incorrect email or password.");
  if (code === "email_not_confirmed") return new AppError("AUTHENTICATION", "Please confirm your email address before signing in. Check your inbox for the confirmation link.");
  if (code === "user_already_exists" || code === "signup_disabled") return new AppError("VALIDATION", message || "Unable to create your account.");
  if (code === "user_banned") return new AppError("AUTHORIZATION", "This account is disabled.");
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return new AppError("VALIDATION", "Too many attempts. Please wait a moment and try again.");
  if (code === "same_password") return new AppError("VALIDATION", "Choose a password you have not used before.");
  return new AppError("AUTHENTICATION", message);
}

/**
 * Resolves the post-authentication destination: a sanitized `next` path when
 * provided, otherwise the landing area of the signed-in user's own role
 * (read through the user's RLS-scoped profile).
 */
async function resolveSignedInDestination(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string | null | undefined,
  rawNext?: string | null,
): Promise<string> {
  const nextPath = sanitizeNextPath(rawNext);
  if (nextPath) return nextPath;
  if (!userId) return getAuthenticatedLandingPath(null);
  const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  const role = (data as { role?: unknown } | null)?.role;
  return getAuthenticatedLandingPath(typeof role === "string" ? role : null);
}

/** Form-friendly result returned to the client instead of throwing. */
export interface AuthActionState {
  status: "idle" | "success" | "error";
  message?: string;
  email?: string;
  emailVerificationRequired?: boolean;
}

/** Maps any thrown value to a safe, user-facing message without technical detail. */
function toAuthStateError(error: unknown, fallback: string): AuthActionState {
  if (error instanceof AppError) return { status: "error", message: error.message || fallback };
  if (error instanceof z.ZodError) return { status: "error", message: error.issues[0]?.message ?? fallback };
  return { status: "error", message: fallback };
}

export async function signUpAction(_previous: AuthActionState, input: FormData): Promise<AuthActionState> {
  try {
    const { email, fullName, password, accountType, businessNui } = signUpSchema.parse({
      email: input.get("email"),
      fullName: input.get("fullName"),
      password: input.get("password"),
      confirmPassword: input.get("confirmPassword"),
      accountType: input.get("accountType") ?? "individual",
      businessNui: input.get("businessNui") || undefined,
    });
    // Abuse protection before any Auth/DB work (best-effort per-instance).
    enforceRateLimit({ key: `auth:signup:${await getClientIp()}`, limit: 5, windowMs: 60 * 60 * 1_000 });
    // Canonical NUI normalization happens server-side: the client value is
    // never stored as-is, and an invalid/missing NUI cannot reach Auth.
    const normalizedNui = accountType === "business" ? normalizeBusinessNui(businessNui) : null;
    if (accountType === "business" && !normalizedNui) {
      throw new AppError("VALIDATION", "Enter your business NUI to complete business registration.");
    }
    const supabase = await createSupabaseServerClient();
    // full_name and the business signup context travel through user metadata so
    // the handle_new_user trigger creates the public.users profile and, for
    // business signups, the business_profiles row (NUI) atomically with the
    // auth user. Metadata is captured once at signup; the NUI itself is
    // persisted in business_profiles and validated/uniqueness-checked there.
    const metadata: Record<string, string> = { full_name: fullName, account_type: accountType };
    if (normalizedNui) metadata.business_nui = normalizedNui;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (error) {
      // A duplicate NUI fails inside the trigger with a Postgres error; map it
      // to the same user-safe message whether Supabase surfaces it as a DB or      // auth error.
      const combined = `${error.code ?? ""} ${error.message}`.toLowerCase();
      if (combined.includes("business_nui") || combined.includes("nui")) {
        throw new AppError("VALIDATION", "This business NUI is already registered.");
      }
      throw mapAuthError(error.code, error.message || "Unable to create your account.");
    }
    if (data.session && data.user) {
      // With email auto-confirmation enabled the trigger ran synchronously;
      // verify the business profile actually landed and compensate otherwise
      // (best-effort auth-user delete) so no partially configured account
      // remains. Individual signups skip this path entirely.
      if (accountType === "business") {
        const confirmed = await confirmBusinessProfile(data.user.id, normalizedNui as string);
        if (!confirmed) {
          await removeAuthUser(data.user.id);
          throw new AppError("VALIDATION", "This business NUI is already registered.");
        }
      }
      // Business NUI registration is a sensitive identity event.
      await recordAuditEvent({
        actorId: data.user.id,
        action: accountType === "business" ? "business_nui_registered" : "account_registered",
        entityType: "business_profiles",
        entityId: data.user.id,
        metadata: accountType === "business" ? { accountType } : undefined,
      });
      // Land the new user on their role's area (new accounts are APPLICANT via
      // the profile trigger).
      await redirect(await resolveSignedInDestination(supabase, data.user.id, null));
    }
    return { status: "success", email, emailVerificationRequired: true };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return toAuthStateError(error, "Unable to create your account. Please try again.");
  }
}

/** Confirms the trigger created the business profile with the expected NUI. */
async function confirmBusinessProfile(userId: string, normalizedNui: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("business_profiles").select("user_id, business_nui").eq("user_id", userId).maybeSingle();
  if (error) {
    logger.warn("business_profile_confirm_failed", { userId, message: error.message.slice(0, 200) });
    return false;
  }
  return Boolean(data) && (data as { business_nui?: string } | null)?.business_nui === normalizedNui;
}

/** Best-effort compensation: remove a just-created auth user without a complete profile. */
async function removeAuthUser(userId: string): Promise<void> {
  try {
    const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(userId);
    if (error) logger.warn("business_signup_compensation_failed", { userId });
  } catch (compensationError) {
    logger.warn("business_signup_compensation_failed", { userId, message: compensationError instanceof Error ? compensationError.message.slice(0, 200) : "unknown" });
  }
}

export async function signInAction(_previous: AuthActionState, input: FormData): Promise<AuthActionState> {
  try {
    const { email, password } = signInSchema.parse({ email: input.get("email"), password: input.get("password") });
    // Credential-stuffing protection before contacting Auth (best-effort per-instance).
    enforceRateLimit({ key: `auth:signin:${await getClientIp()}`, limit: 10, windowMs: 5 * 60 * 1_000 });
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw mapAuthError(error.code, error.message || "Unable to sign in.");
    const rawNext = input.get("next");
    await redirect(await resolveSignedInDestination(supabase, data.user?.id, typeof rawNext === "string" ? rawNext : null));
    return { status: "success" };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return toAuthStateError(error, "Unable to sign in. Please try again.");
  }
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError("DATABASE", "Unable to sign out.", error);
  redirect("/");
}

export async function requestPasswordResetAction(_previous: AuthActionState, input: FormData): Promise<AuthActionState> {
  try {
    const { email } = forgotPasswordSchema.parse({ email: input.get("email") });
    // Email-triggering endpoint: strict per-IP budget (best-effort per-instance).
    enforceRateLimit({ key: `auth:reset:${await getClientIp()}`, limit: 5, windowMs: 60 * 60 * 1_000 });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: passwordResetRedirect });
    if (error) throw mapAuthError(error.code, error.message || "Unable to send the reset email.");
    return { status: "success", email };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return toAuthStateError(error, "Unable to send the reset email. Please try again.");
  }
}

export async function updatePasswordAction(_previous: AuthActionState, input: FormData): Promise<AuthActionState> {
  try {
    const { password } = resetPasswordSchema.parse({ password: input.get("password"), confirmPassword: input.get("confirmPassword") });
    enforceRateLimit({ key: `auth:update-password:${await getClientIp()}`, limit: 10, windowMs: 10 * 60 * 1_000 });
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AppError("AUTHENTICATION", "This password reset link is invalid or has expired. Please request a new one.", userError);
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw mapAuthError(error.code, error.message || "Unable to update your password.");
    await redirect(await resolveSignedInDestination(supabase, user.id, null));
    return { status: "success" };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return toAuthStateError(error, "Unable to update your password. Please try again.");
  }
}

/** redirect() throws a digest-marked error; it must keep propagating. */
function isRedirect(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "digest" in error);
}

/** Exchanges an email confirmation code for a session; the caller decides where to redirect. */
export async function confirmEmailAction(code: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw new AppError("AUTHENTICATION", "This confirmation link is invalid or has expired. Please sign in to continue.", error);
  }
}
