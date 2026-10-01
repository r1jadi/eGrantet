import { Skeleton } from "@/components/ui/skeleton";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function MunicipalityLoading() {
  const ariaLabel = translate(await getServerLocale(), "common.loadingContent");
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true" aria-label={ariaLabel}>
      <div className="h-9 w-64 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-[5.5rem] w-full rounded-lg" />)}
      </div>
      <div className="mt-10 space-y-3">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-lg" />)}
      </div>
    </main>
  );
}
