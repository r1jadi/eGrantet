import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging/logger";
import { USER_ROLES, type UserRole } from "@/modules/users";
import { assertAdminAllowlistAccess, isAllowedAdminAreaEmail, isAdminEmail, parseAdminEmails } from "./admin-allowlist";
import { assertMunicipalityMembership, assertRole, hasAnyRole, type AuthorizationSubject } from "./authorization-policy";

const profileSchema = z.object({ id: z.uuid(), role: z.enum(USER_ROLES), full_name: z.string().nullable() });
export interface CurrentProfile extends AuthorizationSubject { fullName: string | null; email: string | null; }
export interface MunicipalityMembership { municipalityId: string; }
export async function getCurrentUser() { const client = await createSupabaseServerClient(); const { data: { user }, error } = await client.auth.getUser(); if (error) throw new AppError("AUTHENTICATION", "Authentication could not be verified.", error); return user; }
export async function requireAuth() { const user = await getCurrentUser(); if (!user) throw new AppError("AUTHENTICATION", "You must be signed in."); return user; }
export const requireUser = requireAuth;
export async function getCurrentProfile(): Promise<CurrentProfile | null> { const user = await getCurrentUser(); if (!user) return null; const client = await createSupabaseServerClient(); const { data, error } = await client.from("users").select("id, role, full_name").eq("id", user.id).maybeSingle(); if (error) throw new AppError("DATABASE", "Unable to load your profile.", error); if (!data) return null; const profile = profileSchema.safeParse(data); if (!profile.success) throw new AppError("DATABASE", "Your profile has an invalid role.", profile.error); return { id: profile.data.id, role: profile.data.role, fullName: profile.data.full_name, email: typeof user.email === "string" && user.email.length > 0 ? user.email : null }; }
export async function requireProfile(): Promise<CurrentProfile> { await requireAuth(); const profile = await getCurrentProfile(); if (!profile) throw new AppError("AUTHORIZATION", "Your profile is not available."); return profile; }
export function hasRole(profile: Pick<CurrentProfile, "id" | "role"> | null, ...roles: UserRole[]): boolean { return hasAnyRole(profile, roles); }
export async function requireRole(...roles: UserRole[]): Promise<CurrentProfile> { const profile = await requireProfile(); assertRole(profile, roles); return profile; }

/**
 * Parsed `ADMIN_EMAILS` allowlist (server-only). A missing/empty variable
 * yields an empty allowlist; an invalid entry is logged and degrades to empty
 * rather than crashing every request.
 */
export function getAdminEmailAllowlist(): string[] {
  try {
    return parseAdminEmails(process.env.ADMIN_EMAILS);
  } catch (error) {
    logger.error("admin_emails_invalid", { message: error instanceof Error ? error.message : "unknown" });
    return [];
  }
}

/**
 * Hard platform-admin gate: throws `AUTHORIZATION` unless the verified
 * profile email is on the `ADMIN_EMAILS` allowlist. Fails closed when the
 * variable is missing/empty — no allowlist means no platform admins.
 */
export async function requireAdminAccess(): Promise<CurrentProfile & { isPlatformAdmin: true }> {
  const profile = await requireProfile();
  // The ADMIN database role is required in addition to the allowlist so the
  // allowlist tightens the role model (never replaces it) and role-based
  // routing stays consistent with admin-area access.
  if (profile.role !== "ADMIN") {
    throw new AppError("AUTHORIZATION", "You do not have platform administrator access.");
  }
  return assertAdminAllowlistAccess(profile, getAdminEmailAllowlist());
}

/**
 * Authorization check for the municipality/admin area's Server Actions and
 * pages. Tightens the existing database role/membership model with the
 * allowlist when `ADMIN_EMAILS` is configured; without it, the existing
 * model governs unchanged (empty allowlist never locks the area).
 */
export async function assertAdminAreaAccess(): Promise<CurrentProfile> {
  const profile = await requireProfile();
  if (!isAllowedAdminAreaEmail(profile.email, getAdminEmailAllowlist())) {
    throw new AppError("AUTHORIZATION", "You do not have access to the municipality administration area.");
  }
  return profile;
}
export const requireAnyRole = requireRole;
export async function getCurrentMunicipalityMemberships(): Promise<MunicipalityMembership[]> { const profile = await requireProfile(); const client = await createSupabaseServerClient(); const { data, error } = await client.from("municipality_members").select("municipality_id").eq("user_id", profile.id); if (error) throw new AppError("DATABASE", "Unable to load municipality memberships.", error); return data.map((membership) => ({ municipalityId: membership.municipality_id })); }
export async function isCurrentUserMunicipalityMember(municipalityId: string): Promise<boolean> { const profile = await requireProfile(); if (profile.role === "ADMIN") return true; if (profile.role !== "MUNICIPAL_EMPLOYEE") return false; const client = await createSupabaseServerClient(); const { data, error } = await client.from("municipality_members").select("municipality_id").eq("municipality_id", municipalityId).eq("user_id", profile.id).maybeSingle(); if (error) throw new AppError("DATABASE", "Unable to verify municipality access.", error); return data !== null; }
export async function requireMunicipalityAccess(municipalityId: string): Promise<CurrentProfile> { const profile = await requireProfile(); const isMember = await isCurrentUserMunicipalityMember(municipalityId); assertMunicipalityMembership(profile, isMember); return profile; }
export const requireMunicipalityMembership = requireMunicipalityAccess;
