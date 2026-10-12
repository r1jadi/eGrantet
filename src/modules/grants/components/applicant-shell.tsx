"use client";

import { Bell, FileText, House, Landmark, LogIn, Menu, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useT } from "@/lib/i18n/client";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import type { TranslationKey } from "@/lib/i18n";
import { AuthNavControls, useSessionIdentity } from "@/modules/users";
import { SiteFooter } from "@/components/shared/site-footer";
import { resolveMobileMenuAuthState } from "./mobile-menu-auth-state";

const navigation: Array<{ labelKey: TranslationKey; href: string; icon: typeof House }> = [
  { labelKey: "nav.home", href: "/", icon: House },
  { labelKey: "nav.findGrants", href: "/grants", icon: Search },
  { labelKey: "nav.myProjects", href: "/projects", icon: FileText },
];

/**
 * Registration and sign-in actions at the bottom of the mobile menu.
 * Rendered only for unauthenticated visitors: the header sign-in control is
 * hidden below the `sm` breakpoint, so without this block mobile guests have
 * no path to `/register`. Signed-in visitors keep using the existing header
 * account menu, which stays visible on all viewports.
 */
function MobileMenuAuthActions({ onNavigate }: { onNavigate: () => void }) {
  const { identity, checked } = useSessionIdentity();
  const t = useT();
  if (resolveMobileMenuAuthState(checked, identity) !== "guest") return null;
  return (
    <div className="mt-2 space-y-2 border-t pt-3">
      <Link
        href="/register"
        onClick={onNavigate}
        className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <UserPlus className="size-4" aria-hidden="true" />
        {t("nav.signUp")}
      </Link>
      <Link
        href="/login"
        onClick={onNavigate}
        className="flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors hover:bg-muted"
      >
        <LogIn className="size-4" aria-hidden="true" />
        {t("nav.signIn")}
      </Link>
    </div>
  );
}

export function ApplicantShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();

  return <div className="flex min-h-screen flex-col bg-background">
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-semibold text-foreground" onClick={() => setMenuOpen(false)}>
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Landmark className="size-5" aria-hidden="true" /></span>
          <span><span className="block text-sm font-bold leading-tight">{t("common.productName")}</span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Public grants</span></span>
        </Link>
        <nav aria-label={t("nav.mainNavigation")} className="hidden items-center gap-1 md:flex">
          {navigation.map(({ labelKey, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} className={cn("flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium", active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4" aria-hidden="true" />{t(labelKey)}</Link>;
          })}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/notifications" aria-label={t("nav.notifications")} className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted sm:block"><Bell className="size-5" aria-hidden="true" /></Link>
          <AuthNavControls signedOutClassName="hidden min-h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex" />
          <button type="button" className="rounded-md p-2 hover:bg-muted md:hidden" aria-expanded={menuOpen} aria-controls="applicant-menu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}<span className="sr-only">{t("common.menu")}</span></button>
        </div>
      </div>
      {menuOpen && <nav id="applicant-menu" aria-label={t("nav.mobileNavigation")} className="border-t bg-card px-4 py-3 md:hidden">{navigation.map(({ labelKey, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="size-4" aria-hidden="true" />{t(labelKey)}</Link>)}<MobileMenuAuthActions onNavigate={() => setMenuOpen(false)} /></nav>}
    </header>
    <div className="flex-1">{children}</div>
    <SiteFooter />
  </div>;
}
