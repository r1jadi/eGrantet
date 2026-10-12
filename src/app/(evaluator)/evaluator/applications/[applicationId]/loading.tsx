import { ApplicationDetailSkeleton } from "@/components/shared/skeletons";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function EvaluatorApplicationDetailLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true" aria-label={ariaLabel}>
      <div className="h-4 w-40 animate-pulse rounded bg-muted" aria-hidden="true" />
      <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded bg-muted" aria-hidden="true" />
      <div className="mt-8">
        <ApplicationDetailSkeleton />
      </div>
    </main>
  );
}
