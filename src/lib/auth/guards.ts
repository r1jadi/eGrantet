import { redirect } from "next/navigation";
import { getCurrentProfile, type CurrentProfile } from "./server";
import { areaForPathname, getAuthenticatedLandingPath, isRoleAllowedInArea, sanitizeNextPath, type RouteAreaKey } from "./redirects";

/**
 * Server layout guard for a protected route area. Defense in depth behind the
 * proxy: unauthenticated users are redirected to sign-in (with a sanitized
 * `next` destination); authenticated users whose role does not own the area
 * are redirected to their own landing area.
 */
export async function requireAreaProfile(area: RouteAreaKey): Promise<CurrentProfile> {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) redirect("/login");
  if (!isRoleAllowedInArea(profile.role, area)) redirect(getAuthenticatedLandingPath(profile.role));
  return profile;
}

/**
 * Server guard for authentication pages: signed-in users are redirected to
 * their role landing area, or to a sanitized `next` destination when that
 * destination belongs to an area their role may enter.
 */
export async function redirectIfAuthenticated(rawNext?: string | null): Promise<null> {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) return null;
  const nextPath = sanitizeNextPath(rawNext);
  const nextArea = nextPath ? areaForPathname(nextPath.split("?")[0] as string) : null;
  const targetPath = nextArea && isRoleAllowedInArea(profile.role, nextArea) ? nextPath : getAuthenticatedLandingPath(profile.role);
  redirect(targetPath as string);
}
