"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { LOCALES, LOCALE_LABELS, type Locale } from "./config";
import { useLocale, useSetLocale } from "./client";

/**
 * Global language selector. Switching is instant: the locale store updates
 * client-side and persists to a cookie + localStorage, so server-rendered
 * pages pick the same language on the next request without a full reload or
 * form-state loss.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const router = useRouter();

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{LOCALE_LABELS[locale]}</span>
      <Languages className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" aria-hidden="true" />
      <select
        aria-label={LOCALE_LABELS[locale]}
        value={locale}
        onChange={(event) => {
          setLocale(event.target.value as Locale);
          // The cookie is now updated; refresh Server Components so their
          // cookie-backed translations change with the client-side header.
          router.refresh();
        }}
        className="h-9 cursor-pointer appearance-none rounded-md border bg-card py-0 pl-8 pr-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>{LOCALE_LABELS[option]}</option>
        ))}
      </select>
    </label>
  );
}
