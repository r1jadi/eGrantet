import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { LoadingState } from "@/components/shared/page-states";

export default function Loading() {
  return <ApplicantShell><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="h-4 w-32 animate-pulse rounded bg-muted" /><div className="mt-3 h-10 w-80 max-w-full animate-pulse rounded bg-muted" /><div className="mt-8"><LoadingState rows={6} /></div></main></ApplicantShell>;
}
