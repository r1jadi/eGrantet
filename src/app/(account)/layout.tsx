import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/server";

/**
 * Account-wide routes (notifications, profile, preferences) are available to
 * every authenticated role — unlike area-specific workspaces. Only
 * authentication is required here; each service re-asserts ownership
 * server-side and RLS scopes rows to the owner.
 *
 * These private screens must additionally never appear in search indexes.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) redirect("/login?next=%2Fnotifications");
  return <>{children}</>;
}
