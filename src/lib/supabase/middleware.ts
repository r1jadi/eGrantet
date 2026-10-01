import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./env";
import { classifyRoute, decideRoute } from "@/lib/auth/redirects";

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

/**
 * Session refresh plus coarse route protection for the edge proxy.
 *
 * The routing decision itself is the pure, unit-tested `decideRoute` policy;
 * this adapter supplies the inputs (path, verified session, profile role read
 * through the user's own RLS-scoped profile) and executes the result. The
 * proxy never authorizes data access — fine-grained checks stay in
 * `lib/auth/server` and RLS. Unknown roles fail closed.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const refreshedCookies: CookieToSet[] = [];
  const { url, anonKey } = getSupabasePublicEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach((cookie) => {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
          refreshedCookies.push(cookie);
        });
      },
    },
  });

  const { pathname, search } = request.nextUrl;

  // Public routes only need the session refresh the proxy always performed.
  if (classifyRoute(pathname) === "public") return response;

  // Protected areas and auth pages: load the verified session and the
  // profile role (through the user's own RLS-scoped profile) before deciding.
  const claimsResponse = await supabase.auth.getClaims();
  const claims = claimsResponse.data?.claims;
  const userId = readClaimString(claims, "sub");
  const role = userId ? await readProfileRole(supabase, userId) : null;
  const decision = decideRoute({
    pathname,
    search,
    isAuthenticated: Boolean(claims),
    role,
    rawNext: request.nextUrl.searchParams.get("next"),
  });
  if (decision.kind === "redirect") {
    const target = new URL(decision.destination, request.url);
    if (decision.next) target.searchParams.set("next", decision.next);
    return redirectToWithCookies(target, refreshedCookies);
  }

  return response;
}

function readClaimString(claims: unknown, key: string): string | null {
  if (typeof claims !== "object" || claims === null) return null;
  const value = (claims as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Reads the signed-in user's own profile role; RLS allows only this read. */
async function readProfileRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  const role = (data as { role?: unknown } | null)?.role;
  return typeof role === "string" ? role : null;
}

function redirectToWithCookies(target: URL, refreshedCookies: CookieToSet[]) {
  const redirectResponse = NextResponse.redirect(target);
  // Forward session cookies refreshed during this request so the browser
  // and server stay in sync even when we redirect early.
  for (const cookie of refreshedCookies) {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return redirectResponse;
}
