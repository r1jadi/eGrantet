import { ArrowRight, ClipboardCheck, Search } from "lucide-react";
import Link from "next/link";
import { GrantCard } from "@/modules/grants/components/grant-card";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { listPublicDirectoryGrants } from "@/modules/grants";
import { getCurrentProfile } from "@/lib/auth/server";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  // Guests get a registration CTA in the hero; signed-in visitors already
  // have account actions in the header and must not see a duplicate CTA.
  const profile = await getCurrentProfile().catch(() => null);
  let featured: Awaited<ReturnType<typeof listPublicDirectoryGrants>> = [];
  try {
    featured = (await listPublicDirectoryGrants()).slice(0, 3);
  } catch {
    featured = [];
  }

  return <ApplicantShell>
    <main>
      <section className="border-b bg-gradient-to-br from-slate-950 via-[#123f69] to-[#166b75] text-on-accent">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-on-accent-soft">{t("home.heroBadge")}</p>
          <div className="mt-6 max-w-3xl"><h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("home.heroTitle")}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-on-accent-soft">{t("home.heroSubtitle")}</p></div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/grants" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-white/90 dark:bg-primary-foreground dark:hover:bg-primary-foreground/90">{t("home.exploreGrants")} <ArrowRight className="size-4" aria-hidden="true" /></Link>{!profile && <Link href="/register" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-5 py-2 text-sm font-semibold transition-colors hover:bg-white/10">{t("nav.signUp")} <ArrowRight className="size-4" aria-hidden="true" /></Link>}<a href="#how-it-works" className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/30 px-5 py-2 text-sm font-semibold transition-colors hover:bg-white/10">{t("home.howItWorks")}</a></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("home.openOpportunities")}</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t("home.grantsTitle")}</h2><p className="mt-2 text-muted-foreground">{t("home.grantsSubtitle")}</p></div><Link href="/grants" className="text-sm font-semibold text-primary hover:underline">{t("home.seeAllGrants")} <span aria-hidden="true">→</span></Link></div>
      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {featured.length > 0 ? featured.map((grant) => <GrantCard key={grant.id} grant={grant} featured locale={locale} />) : <p className="text-sm text-muted-foreground">{t("grants.noMatchingGrants")}</p>}
      </div></section>
      <section id="how-it-works" className="border-y bg-card"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="max-w-xl"><p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("home.processTitle")}</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t("home.processSubtitle")}</h2></div><div className="mt-9 grid gap-7 md:grid-cols-3">{[[Search, "home.step1Title", "home.step1Description"], [ClipboardCheck, "home.step2Title", "home.step2Description"], [ArrowRight, "home.step3Title", "home.step3Description"]].map(([Icon, titleKey, descriptionKey]) => { const StepIcon = Icon as typeof Search; return <div key={titleKey as string} className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><StepIcon className="size-5" aria-hidden="true" /></span><div><h3 className="font-semibold">{t(titleKey as never)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(descriptionKey as never)}</p></div></div>; })}</div></div></section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="rounded-2xl bg-primary px-6 py-10 text-on-accent sm:px-10"><h2 className="text-2xl font-bold tracking-tight">{t("home.ctaTitle")}</h2><p className="mt-2 max-w-xl text-on-accent-soft">{t("home.ctaSubtitle")}</p><Link href="/grants" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-white/90 dark:bg-primary-foreground dark:hover:bg-primary-foreground/90">{t("home.ctaButton")}</Link></div></section>
    </main>
  </ApplicantShell>;
}
