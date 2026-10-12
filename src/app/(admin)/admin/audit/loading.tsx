import { PageHeadingSkeleton, DataTableSkeleton } from "@/components/shared/skeletons";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function AdminAuditLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true" aria-label={ariaLabel}>
      <PageHeadingSkeleton />
      <div className="mt-6">
        <DataTableSkeleton />
      </div>
    </main>
  );
}
