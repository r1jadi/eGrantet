import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Landmark, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { formatCurrency, formatDeadline } from "@/modules/grants/components/grant-card";
import { getPublicDirectoryGrantDetail } from "@/modules/grants";
import { getCurrentProfile } from "@/lib/auth/server";
import { authDestinationForPath } from "@/lib/auth/redirects";
import { translate, formatCurrency as formatMoney } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const REQUIREMENT_TYPE_KEYS = {
  ELIGIBILITY: "grantForms.typeEligibility",
  DOCUMENT: "grantForms.typeDocument",
  FINANCIAL: "grantForms.typeFinancial",
  APPLICANT: "grantForms.typeApplicant",
  PROJECT: "grantForms.typeProject",
  OTHER: "grantForms.typeOther",
} as const;

export default async function GrantDetailsPage({ params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = await params;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  let grant: Awaited<ReturnType<typeof getPublicDirectoryGrantDetail>>;
  try {
    grant = await getPublicDirectoryGrantDetail(grantId);
  } catch {
    // NOT_FOUND (or any load failure) renders the standard not-found screen.
    notFound();
  }

  // Guests may browse this page; applying requires an account. The CTA target
  // is computed from the auth policy: Sign Up for application entry, Sign In
  // for returning users. Server-side, /applications/* still enforces auth.
  const profile = await getCurrentProfile().catch(() => null);
  const applyHref = profile
    ? `/applications/new?grant=${grant.id}`
    : (() => { const auth = authDestinationForPath(`/applications/new?grant=${grant.id}`); return `${auth.destination}?next=${encodeURIComponent(auth.next)}`; })();

  return <ApplicantShell><main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <Link href="/grants" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />{t("grants.backToGrants")}</Link>
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div>
        <div className="rounded-xl border bg-card px-5 py-7 sm:px-8 sm:py-9">
          <Badge variant="outline">{grant.municipalityName}</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{grant.title}</h1>
          <div className="mt-7 grid gap-4 border-t pt-6 sm:grid-cols-2">
            <Detail icon={Landmark} label={t("grants.deliveredBy")} value={grant.municipalityName} />
            <Detail icon={CalendarDays} label={t("grants.applicationDeadline")} value={formatDeadline(grant.applicationDeadline, locale)} />
            <Detail icon={Wallet} label={t("grants.availableFunding")} value={grant.fundingAmount === null ? t("grants.deadlineTba") : t("grants.upTo").replace("{amount}", formatMoney(locale, grant.fundingAmount, grant.fundingCurrency))} />
            <Detail icon={CheckCircle2} label={t("applications.status")} value={grant.applicationAvailable ? t("grants.openForApplications") : t("grants.deadlinePassed")} />
          </div>
        </div>

        <section className="mt-8"><h2 className="text-xl font-bold">{t("grants.aboutGrant")}</h2><p className="mt-3 max-w-3xl whitespace-pre-line leading-7 text-muted-foreground">{grant.description}</p></section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">{t("grants.requirementsTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("grants.requirementsDescription")}</p>
          {grant.requirements.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("grants.noRequirementsPublished")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {grant.requirements.map((requirement) => (
                <li key={requirement.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                  <span className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${requirement.isRequired ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{requirement.isRequired ? "!" : "·"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{requirement.name} <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{t(REQUIREMENT_TYPE_KEYS[requirement.type as keyof typeof REQUIREMENT_TYPE_KEYS] ?? "grantForms.typeOther")}</span></p>
                    {requirement.description && <p className="mt-1 text-sm text-muted-foreground">{requirement.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24">
        <Card className="overflow-hidden shadow-sm">
          <div className="bg-primary px-5 py-4 text-primary-foreground">
            <p className="font-semibold">{t("grants.readyToApply")}</p>
            <p className="mt-1 text-sm text-on-accent-soft">{t("grants.readyToApplyHint")}</p>
          </div>
          <CardContent className="p-5">
            {grant.applicationAvailable ? (
              <Link href={applyHref} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                {t("grants.startApplication")} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{t("grants.deadlinePassed")}</p>
            )}
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">{t("grants.saveAndReturn")}</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  </main></ApplicantShell>;
}

function Detail({ icon: Icon, label, value }: { icon: typeof Landmark; label: string; value: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-medium">{value}</p></div></div>;
}
