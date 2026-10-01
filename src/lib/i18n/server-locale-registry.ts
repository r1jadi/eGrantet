import { parseLocale, type Locale } from "./config";

/**
 * Server-side current-locale registry.
 *
 * The root layout records the cookie-resolved locale for the current render
 * before any component renders (layouts render before pages), so server
 * utilities that cannot await `cookies()` (e.g. Server Action error mapping)
 * still translate with the requested language. Client bundles never import
 * this module.
 */
const globalRegistry = globalThis as unknown as { __localeRegistry?: Locale };

export function setRequestLocale(locale: Locale): void {
  globalRegistry.__localeRegistry = locale;
}

export function getServerCurrentLocale(): Locale {
  return parseLocale(globalRegistry.__localeRegistry);
}
