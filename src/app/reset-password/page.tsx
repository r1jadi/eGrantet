import { AuthForm } from "@/modules/users";
import { AuthLayout } from "@/modules/users/components/auth-layout";
export const metadata = { title: "Choose a new password | eGrantet", robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <AuthLayout><AuthForm mode="reset" /></AuthLayout>; }
