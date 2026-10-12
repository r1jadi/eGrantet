import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { HeroSkeleton, GrantCardsSkeleton } from "@/components/shared/skeletons";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function HomeLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <ApplicantShell>
      <main aria-busy="true" aria-label={ariaLabel}>
        <HeroSkeleton />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" aria-hidden="true" />
          <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded bg-muted" aria-hidden="true" />
          <div className="mt-7">
            <GrantCardsSkeleton />
          </div>
        </div>
      </main>
    </ApplicantShell>
  );
}
