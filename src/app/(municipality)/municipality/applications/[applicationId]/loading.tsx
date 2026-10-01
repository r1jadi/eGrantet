import { Skeleton } from "@/components/ui/skeleton";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function MunicipalApplicationDetailLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true" aria-label={ariaLabel}>
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-10 w-96 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-44 w-full rounded-lg" />)}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
