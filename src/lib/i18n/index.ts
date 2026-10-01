/**
 * Client-safe i18n public API. Server-only locale reading lives in
 * `./server` (it needs `next/headers`); importing it from client code would
 * break the bundle. Server components should combine:
 *
 *   import { getServerLocale } from "@/lib/i18n/server";
 *   import { translate, formatCurrency } from "@/lib/i18n";
 */
export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_LABELS, LOCALE_NAMES, INTL_LOCALES, isLocale, parseLocale, type Locale } from "./config";
export { translate } from "./translate";
export type { TranslationKey, TranslationValues } from "./types-helpers";
export { formatDate, formatDateLong, formatDateTime, formatCurrency, formatNumber } from "./format";
