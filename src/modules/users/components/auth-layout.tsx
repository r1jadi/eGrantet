import { Landmark, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { LanguageToggle } from "@/lib/i18n/language-toggle";

export async function AuthLayout({ children }: { children: ReactNode }) {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return <main className="min-h-screen bg-background lg:grid lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-[#123f69] to-[#166b75] p-10 text-white lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-3 self-start font-semibold"><span className="grid size-10 place-items-center rounded-xl bg-white text-primary dark:bg-primary-foreground"><Landmark className="size-5" /></span>{t("common.productName")}</Link>
      <div className="my-auto max-w-lg"><p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-on-accent-soft"><Sparkles className="size-4" />{t("authLayout.badge")}</p><h1 className="mt-6 text-4xl font-bold tracking-tight">{t("authLayout.title")}</h1><p className="mt-5 text-lg leading-8 text-on-accent-soft">{t("authLayout.subtitle")}</p></div>
      <p className="flex items-center gap-2 text-sm text-on-accent-soft"><ShieldCheck className="size-4" />{t("authLayout.secure")}</p>
    </section>
    <section className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-12 lg:py-10"><div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-3 self-start font-semibold text-foreground lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Landmark className="size-5" /></span>{t("common.productName")}</Link><span className="ml-auto flex items-center gap-2"><LanguageToggle /><ThemeToggle /></span></div><div className="mx-auto flex w-full max-w-md flex-1 items-center py-10">{children}</div><p className="text-center text-xs text-muted-foreground">© 2026 {t("common.productName")} · <Link href="/privacy" className="underline hover:text-foreground">{t("footer.privacy")}</Link> · <Link href="/terms" className="underline hover:text-foreground">{t("footer.terms")}</Link></p></section>
  </main>;
}
