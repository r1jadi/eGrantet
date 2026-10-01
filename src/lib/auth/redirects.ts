/**
 * Pure routing policy shared by the proxy (edge runtime) and server guards.
 * No server-only imports here: the proxy cannot use `next/headers`.
 */

/** URL prefix owned by each route area. */
export const ROUTE_AREAS = {
  applicant: "/applications",
  admin: "/admin",
  municipality: "/municipality",
  evaluator: "/evaluator",
} as const;

export type RouteAreaKey = keyof typeof ROUTE_AREAS;

/** Route prefixes that require an authenticated session. */
export const PROTECTED_PREFIXES = Object.values(ROUTE_AREAS) as unknown as readonly string[];

/** Returns the route area owning a pathname, or null for other routes. */
export function areaForPathname(pathname: string): RouteAreaKey | null {
  for (const [area, prefix] of Object.entries(ROUTE_AREAS)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return area as RouteAreaKey;
  }
  return null;
}

/** Authentication pages that signed-in users should be bounced away from. */
export const AUTH_PAGE_PATHS = ["/login", "/register"] as const;

export type RouteArea = "public" | "auth" | "protected";

export function classifyRoute(pathname: string): RouteArea {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return "protected";
  if (AUTH_PAGE_PATHS.some((authPath) => path === authPath || path.startsWith(`${authPath}/`))) return "auth";
  return "public";
}

/**
 * Validates a client-supplied `next` destination so it can never become an
 * open redirect: only same-origin relative paths survive.
 */
export function sanitizeNextPath(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const candidate = raw.trim();
  if (!candidate || candidate.length > 512) return null;
  // Control characters and whitespace are never valid inside a path.
  if (/[\s\0-\x1f\x7f]/.test(candidate)) return null;
  // Scheme-relative, absolute URLs, and protocol tricks are rejected.
  if (/^[/\\]{2,}/.test(candidate) || /^[a-z][a-z0-9+.-]*:/i.test(candidate)) return null;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
  return candidate;
}

/** Where each role lands after authentication, per the authorization model. */
export function getAuthenticatedLandingPath(role: string | null | undefined): string {
  switch (role) {
    case "MUNICIPAL_EMPLOYEE":
      return "/municipality";
    case "ADMIN":
      return "/admin";
    case "EVALUATOR":
      return "/evaluator";
    default:
      return "/applications";
  }
}

/** Roles allowed into each route area, mirroring the server authorization model. */
export function isRoleAllowedInArea(role: string, area: RouteAreaKey): boolean {
  if (role === "APPLICANT") return area === "applicant";
  if (role === "MUNICIPAL_EMPLOYEE") return area === "municipality";
  if (role === "EVALUATOR") return area === "evaluator";
  if (role === "ADMIN") return area === "admin";
  return false;
}

/**
 * Chooses the appropriate authentication destination for a guest who tried to
 * reach an applicant-area path: Sign Up for application entry points (where an
 * account is the natural next step) and Sign In elsewhere (returning users).
 * Pure and unit-tested; used by the proxy decision and by server pages that
 * redirect guests manually.
 */
export function authDestinationForPath(pathWithSearch: string): { destination: string; next: string } {
  const next = sanitizeNextPath(pathWithSearch) ?? "/applications";
  const pathOnly = next.split("?")[0] as string;
  // Application start/resume URLs signal an intent to apply → Sign Up.
  const signup = pathOnly === "/applications/new" || pathOnly.startsWith("/applications/new/");
  return { destination: signup ? "/register" : "/login", next };
}

export type RouteDecision =
  | { kind: "allow" }
  | { kind: "redirect"; destination: string; next?: string | null };

interface RouteDecisionInput {
  pathname: string;
  search: string;
  isAuthenticated: boolean;
  /** Role loaded server-side from the user's own profile; null when absent/unknown. */
  role: string | null;
  /** Raw, untrusted `next` query parameter from an authentication page. */
  rawNext: string | null;
}

/**
 * Pure routing decision used by the edge proxy. Unknown roles fail closed:
 * they are sent home instead of into any protected area.
 */
export function decideRoute(input: RouteDecisionInput): RouteDecision {
  const routeArea = classifyRoute(input.pathname);
  if (routeArea === "public") return { kind: "allow" };

  if (routeArea === "protected") {
    if (!input.isAuthenticated) {
      const auth = authDestinationForPath(`${input.pathname}${input.search}`);
      return { kind: "redirect", destination: auth.destination, next: auth.next };
    }
    const area = areaForPathname(input.pathname);
    if (area && (!input.role || !isRoleAllowedInArea(input.role, area))) {
      const landing = input.role ? getAuthenticatedLandingPath(input.role) : "/";
      // Loop guard: never redirect back into the denied area.
      const destination = areaForPathname(landing) === area ? "/" : landing;
      return { kind: "redirect", destination };
    }
    return { kind: "allow" };
  }

  // Authentication pages: only signed-in users are moved along.
  if (!input.isAuthenticated) return { kind: "allow" };
  const nextPath = sanitizeNextPath(input.rawNext);
  const nextArea = nextPath ? areaForPathname(nextPath.split("?")[0] as string) : null;
  const destination = nextArea && input.role && isRoleAllowedInArea(input.role, nextArea)
    ? (nextPath as string)
    : getAuthenticatedLandingPath(input.role);
  return { kind: "redirect", destination };
}
