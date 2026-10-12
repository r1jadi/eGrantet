import { Skeleton } from "@/components/ui/skeleton";

/**
 * Content-specific loading skeletons that mirror the real screens to
 * minimize layout shift. Every skeleton is `aria-hidden` (via `Skeleton`);
 * loading screens expose a single `aria-busy` region with a localized label.
 * Animation is neutralized under `prefers-reduced-motion` globally.
 */

export function PageHeadingSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-4 w-36 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-2 h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div aria-hidden="true" className="border-b bg-gradient-to-br from-slate-950 via-[#123f69] to-[#166b75]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="h-7 w-64 max-w-full animate-pulse rounded-full bg-white/20" />
        <div className="mt-6 h-12 w-full max-w-2xl animate-pulse rounded-lg bg-white/20" />
        <div className="mt-4 h-6 w-full max-w-xl animate-pulse rounded bg-white/15" />
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <div className="h-11 w-44 animate-pulse rounded-md bg-white/25" />
          <div className="h-11 w-36 animate-pulse rounded-md bg-white/15" />
        </div>
      </div>
    </div>
  );
}

export function GrantCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-5 md:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card">
          <div className="h-2 animate-pulse bg-muted" />
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="space-y-2 border-t pt-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GrantDetailSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-5 w-28" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div>
          <div className="rounded-xl border bg-card px-5 py-7 sm:px-8">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-4 h-10 w-3/4" />
            <div className="mt-7 grid gap-4 border-t pt-6 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="size-5 shrink-0 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="mt-8 h-7 w-48" />
          <Skeleton className="mt-3 h-20 w-full" />
          <Skeleton className="mt-8 h-7 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 lg:sticky lg:top-24">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-4 h-11 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border bg-card px-5 py-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-9 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DataTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-4 gap-3 border-b bg-muted/40 px-5 py-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid grid-cols-4 gap-3 px-5 py-4">
            {Array.from({ length: 4 }, (_, cell) => (
              <Skeleton key={cell} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApplicationDetailSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl" />
        ))}
      </div>
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className="max-w-3xl space-y-5">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-40 rounded-md" />
    </div>
  );
}

export function ApplicationCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-10 w-2/3" />
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="mt-4 h-16 w-full" />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="mt-8">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="mt-3 h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
