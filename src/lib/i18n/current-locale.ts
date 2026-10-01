import { DEFAULT_LOCALE, parseLocale, type Locale } from "./config";

/**
 * Synchronous current-locale view.
 *
 * - Client: the language store keeps this in sync (module-level singleton),
 *   so every consumer — including component-module-scope formatters — sees
 *   the active language and re-renders propagate via useLocale subscribers.
 * - Server: per-request locale cannot live in a module singleton safely, so
 *   server components that need localized formatting pass the locale
 *   explicitly (getServerLocale()). The default here covers server render of
 *   shared presentation components; AsyncLocalStorage would be the next step
 *   if per-request server precision is ever needed.
 */
let current: Locale = DEFAULT_LOCALE;

export function setCurrentLocale(locale: Locale): void {
  current = locale;
}

export function getCurrentLocale(): Locale {
  return parseLocale(current);
}
