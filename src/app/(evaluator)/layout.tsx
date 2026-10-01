import type { ReactNode } from "react";
import { ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { requireAreaProfile } from "@/lib/auth/guards";
import { getServerLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";

/** Server-side guard for the evaluator area; the proxy enforces this first. */
export default async function EvaluatorAreaLayout({ children }: { children: ReactNode }) {
  await requireAreaProfile("evaluator");
  const locale = await getServerLocale();
  return <AppShell productName={translate(locale, "common.productName")} workspaceLabel="Evaluator workspace" navigationItems={[{ label: translate(locale, "evaluator.workspaceTitle"), href: "/evaluator", icon: <ClipboardCheck className="size-4" aria-hidden="true" /> }]}>{children}</AppShell>;
}
