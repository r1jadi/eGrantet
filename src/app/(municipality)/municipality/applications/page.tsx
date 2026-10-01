import { MunicipalApplicationList } from "@/modules/applications/components/municipal-application-list";
import { listMunicipalApplications } from "@/modules/applications";
import { PageHeader } from "@/components/shared/layout";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Applications | Team Avengers" };
export const dynamic = "force-dynamic";

export default async function MunicipalApplicationsPage() {
  const locale = await getServerLocale();
  const applications = await listMunicipalApplications();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title={translate(locale, "municipality.applicationsTitle")}
        description={translate(locale, "municipality.applicationsListDescription")}
      />
      <div className="mt-6">
        <MunicipalApplicationList applications={applications} />
      </div>
    </main>
  );
}
