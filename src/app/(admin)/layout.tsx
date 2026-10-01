import { redirect } from "next/navigation";
import { Building2, ClipboardList, Gavel, Landmark, LayoutDashboard, Mail, ScrollText, Users } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import type { NavigationItem } from "@/components/shared/navigation";
import { requireAdminAccess } from "@/lib/auth/server";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

const navigationItems: NavigationItem[] = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
  { label: "Municipalities", href: "/admin/municipalities", icon: <Building2 className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
  { label: "Users", href: "/admin/users", icon: <Users className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
  { label: "Grants", href: "/admin/grants", icon: <Landmark className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
  { label: "Applications", href: "/admin/applications", icon: <ClipboardList className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
  { label: "Evaluations", href: "/admin/evaluations", icon: <Gavel className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
  { label: "Email delivery", href: "/admin/emails", icon: <Mail className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
  { label: "Audit trail", href: "/admin/audit", icon: <ScrollText className="size-4" aria-hidden="true" />, roles: ["ADMIN"] },
];

/** Platform administration is protected by the server-side ADMIN_EMAILS allowlist. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdminAccess();
  } catch {
    redirect("/");
  }

  const locale = await getServerLocale();
  const localizedNavigationItems = navigationItems.map((item) => ({
    ...item,
    label: item.href === "/admin" ? translate(locale, "nav.dashboard") : item.label,
  }));
  return <AppShell productName={translate(locale, "admin.productName")} navigationItems={localizedNavigationItems}>{children}</AppShell>;
}
