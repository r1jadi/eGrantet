"use client";

import { ErrorState } from "@/components/shared/page-states";
import { useT } from "@/lib/i18n/client";

export default function MunicipalityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <ErrorState
        title={t("errors.reviewWorkspaceTitle")}
        description={t("errors.reviewWorkspaceDescription")}
        onRetry={reset}
      />
    </main>
  );
}
