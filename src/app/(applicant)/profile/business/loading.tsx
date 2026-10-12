import { PageHeadingSkeleton, FormSkeleton, ApplicationCardsSkeleton } from "@/components/shared/skeletons";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function BusinessProfileLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label={ariaLabel}>
      <PageHeadingSkeleton />
      <div className="mt-6">
        <FormSkeleton fields={4} />
      </div>
      <div className="mt-8">
        <ApplicationCardsSkeleton count={2} />
      </div>
    </main>
  );
}
