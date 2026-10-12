import type { ReactNode } from "react";
import { requireAreaProfile } from "@/lib/auth/guards";

/** Applicant area is private: authenticated content must never be indexed. */
export const metadata = { robots: { index: false, follow: false } };

/** Server-side guard for the applicant area; the proxy enforces this first. */
export default async function ApplicantAreaLayout({ children }: { children: ReactNode }) {
  await requireAreaProfile("applicant");
  return <>{children}</>;
}
