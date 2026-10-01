"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export type NavigationRole = "APPLICANT" | "MUNICIPAL_EMPLOYEE" | "EVALUATOR" | "ADMIN";
export interface NavigationItem { label: string; href: string; icon?: ReactNode; roles?: NavigationRole[]; }
export function filterNavigation(items: NavigationItem[], role?: NavigationRole) { return items.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role))); }
export function NavigationList({ items, className }: { items: NavigationItem[]; className?: string }) {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className={cn("space-y-1", className)}>{items.map((item) => {
    const active = item.href === "/municipality" || item.href === "/evaluator" ? pathname === item.href : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{item.icon}<span>{item.label}</span></Link>;
  })}</nav>;
}
