/**
 * Pure server-side admin allowlist policy. Unit-testable without environment
 * access; `lib/auth/server.ts` reads `ADMIN_EMAILS` and applies it, and
 * `lib/auth/guards.ts` applies the area policy to the municipality/admin
 * layout.
 */
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";

const allowlistEmailSchema = z.string().trim().toLowerCase().email();

/**
 * Parses a comma-separated email allowlist: entries are trimmed, empty
 * entries are ignored, and each entry must be a valid email address. Invalid
 * entries fail parsing so a misconfigured variable cannot silently widen or
 * break platform-admin access.
 */
export function parseAdminEmails(raw: string | undefined | null): string[] {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  const result = z.array(allowlistEmailSchema).safeParse(entries);
  if (!result.success) {
    throw new AppError("VALIDATION", "ADMIN_EMAILS contains an invalid email address.");
  }
  return entries;
}

/** True when the email matches an allowlist entry (case-insensitive). */
export function isAdminEmail(email: string | null | undefined, allowlist: readonly string[]): boolean {
  if (!email) return false;
  if (allowlist.length === 0) return false;
  const normalized = email.trim().toLowerCase();
  return allowlist.includes(normalized);
}

/**
 * Area-gate policy for the municipality/admin area. When `ADMIN_EMAILS` is
 * not configured (empty allowlist), the existing database role/membership
 * model governs as before; when configured, only allowlisted emails may
 * enter. Never grants access by itself — it only tightens the role model.
 */
export function isAllowedAdminAreaEmail(email: string | null | undefined, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) return true;
  return isAdminEmail(email, allowlist);
}

/** Minimal profile shape the platform-admin decision needs. */
export interface AdminAccessSubject {
  id: string;
  role: string;
  email: string | null;
}

/**
 * Decision core of the hard platform-admin gate: fails closed when the
 * allowlist is missing/empty (no platform admins exist) and throws unless the
 * verified profile email is allowlisted. The thin async wrapper in
 * `lib/auth/server.ts` (`requireAdminAccess`) supplies the authenticated
 * profile and the parsed environment allowlist.
 */
export function assertAdminAllowlistAccess<T extends AdminAccessSubject>(profile: T | null, allowlist: readonly string[]): T & { isPlatformAdmin: true } {
  if (!profile) throw new AppError("AUTHENTICATION", "You must be signed in.");
  if (!isAdminEmail(profile.email, allowlist)) {
    throw new AppError("AUTHORIZATION", "You do not have platform administrator access.");
  }
  return { ...profile, isPlatformAdmin: true };
}
