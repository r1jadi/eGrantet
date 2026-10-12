import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { PageHeadingSkeleton, FormSkeleton } from "@/components/shared/skeletons";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ProfileSettingsLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <ApplicantShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8" aria-busy="true" aria-label={ariaLabel}>
        <PageHeadingSkeleton />
        <div className="mt-6">
          <FormSkeleton fields={3} />
        </div>
      </main>
    </ApplicantShell>
  );
}
