import { redirect } from "next/navigation";
import { ClipboardList, FileStack, Landmark, LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { getCurrentProfile, getAdminEmailAllowlist, type CurrentProfile } from "@/lib/auth/server";
import { isAllowedAdminAreaEmail } from "@/lib/auth/admin-allowlist";
import { translate, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import type { NavigationItem, NavigationRole } from "@/components/shared/navigation";

/** Municipality workspace is private: review content must never be indexed. */
export const metadata = { robots: { index: false, follow: false } };

const navigationItems: Array<{ labelKey: TranslationKey; href: string; icon: React.ReactNode; roles?: NavigationRole[] }> = [
  { labelKey: "nav.dashboard", href: "/municipality", icon: <LayoutDashboard className="size-4" aria-hidden="true" />, roles: ["MUNICIPAL_EMPLOYEE", "ADMIN"] },
  { labelKey: "nav.applications", href: "/municipality/applications", icon: <FileStack className="size-4" aria-hidden="true" />, roles: ["MUNICIPAL_EMPLOYEE", "ADMIN"] },
  { labelKey: "nav.grants", href: "/municipality/grants", icon: <Landmark className="size-4" aria-hidden="true" />, roles: ["MUNICIPAL_EMPLOYEE", "ADMIN"] },
  { labelKey: "nav.myApplications", href: "/applications", icon: <ClipboardList className="size-4" aria-hidden="true" />, roles: ["APPLICANT"] },
];

export default async function MunicipalityLayout({ children }: { children: React.ReactNode }) {
  let profile: CurrentProfile | null = null;
  try {
    profile = await getCurrentProfile();
  } catch {
    profile = null;
  }
  if (!profile) redirect("/login");
  if (profile.role !== "MUNICIPAL_EMPLOYEE" && profile.role !== "ADMIN") redirect("/");
  if (profile.role === "ADMIN") {
    // Allowlist gate for ADMIN-role visitors only: with ADMIN_EMAILS
    // configured, non-allowlisted admins are bounced even though their
    // database role would admit them. Ordinary municipal employees are
    // governed by their municipality membership, never by the allowlist.
    if (!isAllowedAdminAreaEmail(profile.email, getAdminEmailAllowlist())) redirect("/");
    redirect("/admin");
  }

  const locale = await getServerLocale();
  const t = (key: TranslationKey) => translate(locale, key);
  // Role-filter here: AppShell has no session context, so items restricted to
  // other roles would otherwise render as links that bounce back on visit.
  const visibleItems = navigationItems.filter((item) => !item.roles || item.roles.includes(profile.role as NavigationRole));
  const localizedItems: NavigationItem[] = visibleItems.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }));

  return <AppShell productName={t("municipality.productName")} workspaceLabel="Municipality workspace" navigationItems={localizedItems}>{children}</AppShell>;
}
