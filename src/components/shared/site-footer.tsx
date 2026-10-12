"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { openCookiePreferences } from "@/components/consent/consent";

/**
 * Consistent public footer for eGrantet: branding, public navigation, legal
 * pages, cookie preferences, and a dynamic copyright notice. Only links to
 * real public routes — never to administrative or private screens.
 */
export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-8">
        <div>
          <p className="flex items-center gap-2.5 font-bold text-foreground">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="size-5" aria-hidden="true" />
            </span>
            {t("common.productName")}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{t("footer.description")}</p>
        </div>
        <nav aria-label={t("footer.navigation")}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("footer.navigation")}</p>
          <ul className="mt-3 space-y-2.5 text-sm font-medium">
            <li>
              <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.home")}
              </Link>
            </li>
            <li>
              <Link href="/grants" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.findGrants")}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={t("footer.legal")}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("footer.legal")}</p>
          <ul className="mt-3 space-y-2.5 text-sm font-medium">
            <li>
              <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("footer.privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("footer.terms")}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={openCookiePreferences}
                className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2"
              >
                {t("footer.cookiePreferences")}
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          © {year} {t("common.productName")} · {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
