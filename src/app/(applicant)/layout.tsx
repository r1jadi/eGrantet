import type { ReactNode } from "react";
import { requireAreaProfile } from "@/lib/auth/guards";

/** Server-side guard for the applicant area; the proxy enforces this first. */
export default async function ApplicantAreaLayout({ children }: { children: ReactNode }) {
  await requireAreaProfile("applicant");
  return <>{children}</>;
}
