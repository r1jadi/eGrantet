"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardList, LogOut, Settings, UserRound } from "lucide-react";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { SignOutButton } from "./sign-out-button";

interface SessionIdentity {
  email: string | null;
  fullName: string | null;
  isBusiness: boolean;
}

export type { SessionIdentity };

const menuItemClass = "flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted";

/**
 * Browser-session identity for optimistic header display. Resolves once the
 * Supabase client answers and stays in sync with auth changes. Display-only:
 * the server re-verifies identity and role on every request.
 */
export function useSessionIdentity(): { identity: SessionIdentity | null; checked: boolean } {
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    // A rejected session lookup (unreachable auth backend, offline device)
    // must still resolve to the guest view — otherwise visitors would see no
    // auth actions at all. The server re-verifies everything regardless.
    supabase.auth.getUser().then(
      ({ data }) => {
        if (!active) return;
        const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; email?: string; account_type?: string };
        setIdentity(data.user ? { email: data.user.email ?? meta.email ?? null, fullName: meta.full_name ?? null, isBusiness: meta.account_type === "business" } : null);
        setChecked(true);
      },
      () => {
        if (!active) return;
        setIdentity(null);
        setChecked(true);
      },
    );
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) { setIdentity(null); return; }
      const meta = (session.user.user_metadata ?? {}) as { full_name?: string; email?: string; account_type?: string };
      setIdentity({ email: session.user.email ?? meta.email ?? null, fullName: meta.full_name ?? null, isBusiness: meta.account_type === "business" });
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  return { identity, checked };
}

/**
 * Header account controls driven by the browser session for optimistic display.
 * This is display-only convenience: the server re-verifies identity and role on
 * every request, and sign-out runs through the server action.
 */
export function AuthNavControls({ signedInClassName, signedOutClassName }: { signedInClassName?: string; signedOutClassName?: string }) {
  const t = useT();
  const { identity, checked } = useSessionIdentity();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Derived during render (no effect): signing out closes the account menu
  // automatically because there is no identity to show it for.
  const accountMenuOpen = menuOpen && identity !== null;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [menuOpen]);

  if (!checked) return null;

  if (!identity) {
    return (
      <a href="/login" className={signedOutClassName}>{t("nav.signIn")}</a>
    );
  }

  const displayName = identity.fullName?.trim() || identity.email || t("nav.account");
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div ref={menuRef} className="relative flex items-center">
      <button
        type="button"
        aria-label={t("nav.accountMenuFor", { name: displayName })}
        aria-haspopup="menu"
        aria-expanded={accountMenuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="grid size-9 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white transition-transform hover:scale-105 focus-visible:outline-2 dark:bg-teal-600 dark:text-on-accent"
      >
        {initials}
      </button>
      {accountMenuOpen && (
        <div role="menu" aria-label={t("nav.account")} className="absolute right-0 top-12 z-40 w-60 rounded-xl border bg-card p-2 shadow-lg">
          <div className="border-b px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {identity.fullName && identity.email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{identity.email}</p>}
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" href="/settings/profile" className={menuItemClass} onClick={() => setMenuOpen(false)}>
              <UserRound className="size-4" aria-hidden="true" />{t("nav.myProfile")}
            </Link>
            {identity.isBusiness && (
              <Link role="menuitem" href="/profile/business" className={menuItemClass} onClick={() => setMenuOpen(false)}>
                <Briefcase className="size-4" aria-hidden="true" />{t("nav.myBusiness")}
              </Link>
            )}
            <Link role="menuitem" href="/applications" className={menuItemClass} onClick={() => setMenuOpen(false)}>
              <ClipboardList className="size-4" aria-hidden="true" />{t("nav.myApplications")}
            </Link>
            <Link role="menuitem" href="/settings/notifications" className={menuItemClass} onClick={() => setMenuOpen(false)}>
              <Settings className="size-4" aria-hidden="true" />{t("nav.settings")}
            </Link>
            <div className="my-1.5 border-t" />
            <SignOutButton className={`${menuItemClass} text-destructive hover:bg-destructive-background`}>
              <LogOut className="size-4" aria-hidden="true" />{t("nav.signOut")}
            </SignOutButton>
          </div>
        </div>
      )}
    </div>
  );
}
