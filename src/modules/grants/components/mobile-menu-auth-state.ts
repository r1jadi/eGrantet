import type { SessionIdentity } from "@/modules/users";

export type MobileMenuAuthState = "loading" | "guest" | "member";

/**
 * Decides which auth block the mobile navigation menu shows.
 *
 * - `loading`: session not resolved yet — render nothing to avoid flashing
 *   the wrong actions.
 * - `guest`: unauthenticated visitor — show the registration CTA (primary)
 *   and the sign-in link (secondary).
 * - `member`: signed-in visitor — show nothing extra; the existing header
 *   account menu already provides profile, dashboard, and sign-out actions.
 *
 * Pure and DOM-free so both states are unit testable.
 */
export function resolveMobileMenuAuthState(
  checked: boolean,
  identity: SessionIdentity | null,
): MobileMenuAuthState {
  if (!checked) return "loading";
  return identity ? "member" : "guest";
}
