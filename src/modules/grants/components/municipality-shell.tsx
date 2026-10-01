"use client";

import { Building2, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useT } from "@/lib/i18n/client";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import type { TranslationKey } from "@/lib/i18n";
import { SignOutButton } from "@/modules/users";

const navigation: Array<{ labelKey: TranslationKey; href: string; icon: typeof Building2 }> = [
  { labelKey: "nav.dashboard", href: "/municipality", icon: Building2 },
  { labelKey: "nav.grants", href: "/municipality/grants", icon: Building2 },
  { labelKey: "nav.myProjects", href: "/municipality/projects", icon: Building2 },
];

/** Municipality console shell: role landing chrome with server-verified access. */
export function MunicipalityShell({ children }: { children: ReactNode }) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/municipality" className="flex items-center gap-3 font-semibold text-foreground" onClick={() => setMenuOpen(false)}>
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-5" aria-hidden="true" /></span>
          <span>{t("common.productName")} <span className="text-sm font-normal text-muted-foreground">· {t("municipality.areaName")}</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <SignOutButton className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{t("nav.signOut")}</SignOutButton>
          <button type="button" className="rounded-md p-2 hover:bg-muted lg:hidden" aria-expanded={menuOpen} aria-controls="municipality-menu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}<span className="sr-only">{t("common.menu")}</span></button>
        </div>
      </div>
    </header>
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-7 sm:px-6 lg:px-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav aria-label={t("municipality.navigationLabel")} className="space-y-1">
          {navigation.map(({ labelKey, href, icon: Icon }) => {
            const active = href === "/municipality" ? pathname === "/municipality" : pathname.startsWith(href);
            return <Link key={href} href={href} className={cn("flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4" aria-hidden="true" />{t(labelKey)}</Link>;
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
    {menuOpen && <nav id="municipality-menu" aria-label={t("municipality.navigationLabel")} className="border-t bg-card px-4 py-3 lg:hidden">{navigation.map(({ labelKey, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="size-4" aria-hidden="true" />{t(labelKey)}</Link>)}</nav>}
  </div>;
}
