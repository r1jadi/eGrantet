"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import {
  CONSENT_STORAGE_KEY,
  OPEN_COOKIE_PREFERENCES_EVENT,
  acceptAllConsent,
  customConsent,
  parseConsent,
  rejectOptionalConsent,
  saveConsent,
} from "./consent";

function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredConsent(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Server renders no banner; the client store takes over after hydration. */
function serverConsentSnapshot(): string | null {
  return null;
}

/**
 * Privacy-conscious cookie-consent banner + preferences dialog.
 *
 * - Essential cookies always run (sign-in session, security).
 * - Preferences (language/theme memory) are remembered only after opt-in.
 * - eGrantet currently ships no analytics/marketing scripts; that category is
 *   shown as "not used" rather than inventing tracking to justify the banner.
 * - Accept and Reject are visually equal (no dark patterns); dismissing
 *   without choosing never counts as consent.
 */
export function CookieConsent() {
  const t = useT();
  const rawStored = useSyncExternalStore(subscribeConsent, readStoredConsent, serverConsentSnapshot);
  const stored = parseConsent(rawStored);
  const [customizing, setCustomizing] = useState(false);
  const [preferencesChecked, setPreferencesChecked] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The footer "Cookie preferences" link re-opens the dialog via event.
  useEffect(() => {
    const reopen = () => {
      setSaveError(false);
      setSavedFlash(false);
      setCustomizing(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
  }, []);

  const dialogOpen = stored === null || customizing;

  useEffect(() => {
    if (dialogOpen) headingRef.current?.focus();
  }, [dialogOpen]);

  const persist = (consent: ReturnType<typeof acceptAllConsent>) => {
    let ok = false;
    try {
      ok = saveConsent(window.localStorage, consent);
    } catch {
      ok = false;
    }
    if (!ok) {
      // Never claim preferences were saved when persistence failed.
      setSaveError(true);
      return;
    }
    setSaveError(false);
    setCustomizing(false);
    setSavedFlash(true);
  };

  // Consent decided and dialog closed: render nothing (or a polite
  // screen-reader confirmation right after saving).
  if (!dialogOpen) {
    return savedFlash ? (
      <p role="status" className="sr-only">
        {t("cookies.saved")}
      </p>
    ) : null;
  }

  const firstVisit = stored === null && !customizing;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-heading"
      aria-describedby="cookie-consent-description"
      className="cookie-banner fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-5"
    >
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary" aria-hidden="true">
            <Cookie className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 ref={headingRef} id="cookie-consent-heading" tabIndex={-1} className="text-base font-bold tracking-tight focus:outline-none">
              {t("cookies.title")}
            </h2>
            <p id="cookie-consent-description" className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("cookies.description")}
            </p>
          </div>
        </div>

        {customizing && (
          <fieldset className="mt-4 space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">{t("cookies.customize")}</legend>
            <label className="flex cursor-not-allowed items-start gap-3 opacity-90">
              <input type="checkbox" checked disabled className="mt-1 size-4 accent-primary" aria-describedby="cookie-essential-desc" />
              <span>
                <span className="block text-sm font-semibold">
                  {t("cookies.essentialTitle")} · {t("cookies.alwaysOn")}
                </span>
                <span id="cookie-essential-desc" className="mt-0.5 block text-xs text-muted-foreground">
                  {t("cookies.essentialDescription")}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={preferencesChecked}
                onChange={(event) => setPreferencesChecked(event.target.checked)}
                className="mt-1 size-4 accent-primary"
                aria-describedby="cookie-preferences-desc"
              />
              <span>
                <span className="block text-sm font-semibold">{t("cookies.preferencesTitle")}</span>
                <span id="cookie-preferences-desc" className="mt-0.5 block text-xs text-muted-foreground">
                  {t("cookies.preferencesDescription")}
                </span>
              </span>
            </label>
            <div className="flex items-start gap-3 opacity-90">
              <input type="checkbox" checked={false} disabled className="mt-1 size-4 accent-primary" aria-describedby="cookie-analytics-desc" />
              <span>
                <span className="block text-sm font-semibold">{t("cookies.analyticsTitle")}</span>
                <span id="cookie-analytics-desc" className="mt-0.5 block text-xs text-muted-foreground">
                  {t("cookies.analyticsDescription")}
                </span>
              </span>
            </div>
          </fieldset>
        )}

        {saveError && (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {t("common.errorRetryMessage")}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {customizing ? (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={() => persist(customConsent(preferencesChecked))}>
                {t("cookies.save")}
              </Button>
              {!firstVisit && (
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setCustomizing(false)}>
                  {t("common.close")}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={() => persist(acceptAllConsent())}>
                {t("cookies.acceptAll")}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => persist(rejectOptionalConsent())}>
                {t("cookies.rejectOptional")}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setCustomizing(true)}>
                {t("cookies.customize")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
