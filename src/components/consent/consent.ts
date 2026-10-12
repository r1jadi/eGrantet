/**
 * Cookie-consent state model for eGrantet.
 *
 * Pure, DOM-free helpers so consent parsing and persistence can be unit
 * tested. The actual technologies behind each category:
 *
 * - essential: Supabase Auth session cookies, security cookies. Always on.
 * - preferences: language (`locale` cookie + localStorage) and theme
 *   (`theme` localStorage). Written only after the user acts, remembered here.
 * - analytics: no analytics, advertising, or tracking scripts are used by
 *   eGrantet. The category exists so the banner stays honest if one is ever
 *   added — and so "accept all" cannot enable something that does not exist.
 */

export const CONSENT_STORAGE_KEY = "egrantet-consent-v1";
export const CONSENT_VERSION = 1;

/** Custom event that re-opens the preferences dialog (used by the footer). */
export const OPEN_COOKIE_PREFERENCES_EVENT = "egrantet:open-cookie-preferences";

export interface ConsentPreferences {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  version: number;
  decidedAt: string;
}

export function acceptAllConsent(now: Date = new Date()): ConsentPreferences {
  return { essential: true, preferences: true, analytics: false, version: CONSENT_VERSION, decidedAt: now.toISOString() };
}

export function rejectOptionalConsent(now: Date = new Date()): ConsentPreferences {
  return { essential: true, preferences: false, analytics: false, version: CONSENT_VERSION, decidedAt: now.toISOString() };
}

export function customConsent(preferences: boolean, now: Date = new Date()): ConsentPreferences {
  return {
    essential: true,
    preferences,
    // eGrantet ships no analytics/marketing scripts, so this is always false.
    analytics: false,
    version: CONSENT_VERSION,
    decidedAt: now.toISOString(),
  };
}

export function isValidConsent(value: unknown): value is ConsentPreferences {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.essential === true &&
    typeof record.preferences === "boolean" &&
    typeof record.analytics === "boolean" &&
    record.version === CONSENT_VERSION &&
    typeof record.decidedAt === "string" &&
    !Number.isNaN(Date.parse(record.decidedAt))
  );
}

/** Parses a raw stored value; returns null when nothing valid was stored. */
export function parseConsent(raw: string | null | undefined): ConsentPreferences | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidConsent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export type ConsentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Reads consent from storage; null means "first visit, no choice yet". */
export function loadConsent(storage: ConsentStorage): ConsentPreferences | null {
  try {
    return parseConsent(storage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Persists consent. Returns true only when the write actually succeeded —
 * callers must not report "saved" when this returns false.
 */
export function saveConsent(storage: ConsentStorage, consent: ConsentPreferences): boolean {
  try {
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    return true;
  } catch {
    return false;
  }
}

/** Whether optional preference storage (language/theme memory) is allowed. */
export function isPreferencesAllowed(consent: ConsentPreferences | null): boolean {
  return consent?.preferences === true;
}

/** Dispatches the event that re-opens cookie preferences (footer link). */
export function openCookiePreferences(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT));
  }
}
