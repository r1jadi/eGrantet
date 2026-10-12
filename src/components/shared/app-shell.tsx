"use client";

import { useState, type ReactNode } from "react";
import { Bell, Building2, Menu, X } from "lucide-react";
import Link from "next/link";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { useT } from "@/lib/i18n/client";
import { AuthNavControls } from "@/modules/users";
import { NavigationList, type NavigationItem } from "./navigation";
import { SiteFooter } from "./site-footer";

export function AppShell({ children, navigationItems = [], productName, workspaceLabel }: { children: ReactNode; navigationItems?: NavigationItem[]; productName?: string; workspaceLabel?: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const title = productName ?? t("common.productName");
  return <div className="flex min-h-screen flex-col bg-background">
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}<span className="sr-only">{t("common.menu")}</span></button>
        <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Building2 className="size-5" aria-hidden="true" /></span>
        <div><p className="text-sm font-bold leading-tight text-foreground">{title}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{workspaceLabel ?? "Public grants"}</p></div>
      </div>
      <div className="flex items-center gap-2"><LanguageToggle /><Link href="/notifications" aria-label={t("nav.notifications")} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Bell className="size-5" aria-hidden="true" /></Link><AuthNavControls /></div>
    </header>
    <aside id="mobile-navigation" className={`${open ? "block" : "hidden"} border-b bg-card p-3 shadow-sm lg:hidden`}><p className="px-3 pb-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{workspaceLabel ?? "Workspace"}</p><NavigationList items={navigationItems} /></aside>
    <div className="flex-1 lg:grid lg:grid-cols-[12.25rem_minmax(0,1fr)]"><aside className="hidden min-h-[calc(100vh-4rem)] border-r bg-card px-3 py-5 lg:block"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{workspaceLabel ?? "Workspace"}</p><NavigationList items={navigationItems} /></aside><main className="min-w-0">{children}</main></div>
    <SiteFooter />
  </div>;
}
