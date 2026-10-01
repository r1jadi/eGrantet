import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/lib/auth/guards";
import { AuthForm } from "@/modules/users";
import { AuthLayout } from "@/modules/users/components/auth-layout";

export const metadata: Metadata = { title: "Create an account | Team Avengers" };

export default async function RegisterPage() {
  await redirectIfAuthenticated(null);
  return <AuthLayout><AuthForm mode="register" /></AuthLayout>;
}
