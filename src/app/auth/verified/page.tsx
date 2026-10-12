import { redirect } from "next/navigation";
import { confirmEmailAction } from "@/modules/users/actions/auth-actions";
import { getAuthenticatedLandingPath } from "@/lib/auth/redirects";
import { getCurrentProfile } from "@/lib/auth/server";

export const metadata = { title: "Email confirmed | eGrantet", robots: { index: false, follow: false } };

export default async function AuthVerifiedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawCode = params.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  if (!code) redirect("/login?confirmed=invalid");
  try {
    await confirmEmailAction(code);
  } catch {
    redirect("/login?confirmed=invalid");
  }
  // Land the confirmed user in their role's area (new users are APPLICANT).
  const profile = await getCurrentProfile().catch(() => null);
  redirect(getAuthenticatedLandingPath(profile?.role ?? null));
}
