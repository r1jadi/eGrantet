"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { setCurrentLocale } from "./current-locale";
import { translateWithValues } from "./translate";
import type { TranslationKey, TranslationValues } from "./types-helpers";

export type { TranslationKey, TranslationValues };

/**
 * Locale store shared by every client component. The current locale lives in
 * a module-level snapshot and is persisted to a cookie (so server components
 * agree) plus localStorage (so the preference survives browser restarts).
 * Mutations happen only in event handlers / module init — never during render.
 */

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const candidate = (window as Window & { __LOCALE__?: unknown }).__LOCALE__;
  return isLocale(candidate) ? candidate : DEFAULT_LOCALE;
}

// The root layout assigns __LOCALE__ before this module hydrates. Reading it
// here makes the browser store agree with the locale used for the server render.
let currentLocale: Locale = readInitialLocale();
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

function setLocaleGlobal(locale: Locale): void {
  if (currentLocale === locale) return;
  currentLocale = locale;
  setCurrentLocale(locale);
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
    localStorage.setItem(LOCALE_COOKIE, locale);
  } catch {
    /* private browsing: language simply does not persist */
  }
  emitChange();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Locale {
  return currentLocale;
}

interface LocaleContextValue {
  /** Locale resolved on the server for the current document (cookie-based). */
  serverLocale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Client boundary of the i18n system. Rendered once in the root layout with
 * the cookie-resolved locale. The pre-paint script adopts the persisted value
 * into the module store before hydration, so client snapshots agree with the
 * server render without any render-phase mutation.
 */
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const setLocale = useCallback((locale: Locale) => setLocaleGlobal(locale), []);
  const value = useMemo(() => ({ serverLocale: initialLocale, setLocale }), [initialLocale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Reactive locale for client components (SSR + client agree via context). */
export function useLocale(): Locale {
  const context = useContext(LocaleContext);
  const getServerSnapshot = useCallback(() => context?.serverLocale ?? DEFAULT_LOCALE, [context]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Translation hook for client components; re-renders on language change. */
export function useT(): (key: TranslationKey, values?: TranslationValues) => string {
  const locale = useLocale();
  return useCallback((key: TranslationKey, values?: TranslationValues) => translateWithValues(locale, key, values), [locale]);
}

/** Switches language client-side; persists the choice for the whole site. */
export function useSetLocale(): (locale: Locale) => void {
  const context = useContext(LocaleContext);
  return useCallback((locale: Locale) => {
    if (isLocale(locale)) (context?.setLocale ?? setLocaleGlobal)(locale);
  }, [context]);
}

/** Test/exported synchronous views of the shared store. */
export function __testGetCurrentLocale(): Locale {
  return currentLocale;
}

export function __testSubscribe(listener: () => void): () => void {
  return subscribe(listener);
}

export function __testSetLocale(locale: Locale): void {
  setLocaleGlobal(locale);
}
