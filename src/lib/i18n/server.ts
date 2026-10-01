/**
 * Server-side locale resolution. Reads the locale from cookies (set by the
 * language toggle) with fallback to the default locale. Server components and
 * server actions share the same resolution path, so server- and client-
 * rendered text always agree.
 */
import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, DEFAULT_LOCALE, parseLocale, type Locale } from "./config";

/** Effective locale for the current server render/action. */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

/**
 * Resolves the locale for a Server Action / route handler from the request
 * headers (or cookies via the same store as rendering). Used where a fresh
 * `cookies()` read is fine inside the action.
 */
export async function resolveActionLocale(): Promise<Locale> {
  return getServerLocale();
}
