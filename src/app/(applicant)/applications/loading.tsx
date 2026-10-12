import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { PageHeadingSkeleton, DashboardStatsSkeleton, ApplicationCardsSkeleton } from "@/components/shared/skeletons";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ApplicationsLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <ApplicantShell>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8" aria-busy="true" aria-label={ariaLabel}>
        <PageHeadingSkeleton />
        <div className="mt-6">
          <DashboardStatsSkeleton count={3} />
        </div>
        <div className="mt-6">
          <ApplicationCardsSkeleton />
        </div>
      </main>
    </ApplicantShell>
  );
}
