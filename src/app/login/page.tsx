import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/lib/auth/guards";
import { AuthForm } from "@/modules/users";
import { AuthLayout } from "@/modules/users/components/auth-layout";

export const metadata: Metadata = { title: "Sign in | Team Avengers" };

function readNext(params: Record<string, string | string[] | undefined>): string | undefined {
  const raw = params.next;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value : undefined;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  await redirectIfAuthenticated(readNext(params));
  return <AuthLayout><AuthForm mode="login" next={readNext(params)} /></AuthLayout>;
}
