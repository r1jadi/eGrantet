/** Supported presentation locales for the grants platform. */
export const LOCALES = ["sq", "en", "sr"] as const;

export type Locale = (typeof LOCALES)[number];

/** Locale used when no preference exists. */
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  sq: "🇦🇱 Shqip",
  en: "🇬🇧 English",
  sr: "🇷🇸 Srpski",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  sq: "Shqip",
  en: "English",
  sr: "Srpski",
};

/** `Intl` locale identifiers (sq is the Kosovo Albanian presentation). */
export const INTL_LOCALES: Record<Locale, string> = {
  sq: "sq-XK",
  en: "en-IE",
  sr: "sr-Latn-RS",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Parses a stored/cookie value into a Locale, falling back to the default. */
export function parseLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
