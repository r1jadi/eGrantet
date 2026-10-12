import { AuthForm } from "@/modules/users";
import { AuthLayout } from "@/modules/users/components/auth-layout";
export const metadata = { title: "Reset password | eGrantet", robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <AuthLayout><AuthForm mode="forgot" /></AuthLayout>; }
