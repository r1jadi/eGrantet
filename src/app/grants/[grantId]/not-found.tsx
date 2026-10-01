import Link from "next/link";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/page-states";

export default function GrantNotFound() {
  return <ApplicantShell><main className="mx-auto max-w-3xl px-4 py-20 sm:px-6"><EmptyState title="This grant is no longer available" description="The link may be outdated, or the grant has been removed." action={<Link href="/grants"><Button>Browse open grants</Button></Link>} /></main></ApplicantShell>;
}
