"use client";

import { ErrorState } from "@/components/shared/page-states";

export default function MunicipalApplicationDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <ErrorState
        title="We couldn't load this application"
        description="The application may be unavailable or you may not have access. Please try again."
        onRetry={reset}
      />
    </main>
  );
}
