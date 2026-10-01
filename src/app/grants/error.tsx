"use client";

import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { ErrorState } from "@/components/shared/page-states";

export default function GrantsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ApplicantShell><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><ErrorState title="We couldn't load the grants" description="Please check your connection and try again." onRetry={reset} /></main></ApplicantShell>;
}
