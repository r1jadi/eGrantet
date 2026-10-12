import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { GrantDirectory } from "@/modules/grants/components/grant-directory";
import { EmptyState } from "@/components/shared/page-states";
import { listPublicDirectoryGrants } from "@/modules/grants";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Find grants | eGrantet",
  description:
    "Explore open municipal grants for community projects, local business, culture, youth, and environment. Check requirements and apply online with eGrantet.",
  alternates: { canonical: "/grants" },
};
export const dynamic = "force-dynamic";

export default async function GrantsPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  let grants: Awaited<ReturnType<typeof listPublicDirectoryGrants>> = [];
  let loadFailed = false;
  try {
    grants = await listPublicDirectoryGrants();
  } catch {
    loadFailed = true;
  }
  const municipalities = [...new Set(grants.map((grant) => grant.municipalityName))].sort();

  return <ApplicantShell><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("home.openOpportunities")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("grants.directoryTitle")}</h1><p className="mt-3 max-w-2xl text-muted-foreground">{t("grants.directoryDescription")}</p><section className="mt-8" aria-label={t("grants.searchLabel")}>
    {loadFailed ? (
      <EmptyState title={t("errors.database")} description={t("grants.directoryDescription")} />
    ) : grants.length === 0 ? (
      <EmptyState title={t("grants.noMatchingGrants")} description={t("grants.noMatchingGrantsDescription")} />
    ) : (
      <GrantDirectory grants={grants} municipalities={municipalities} />
    )}
  </section></main></ApplicantShell>;
}
