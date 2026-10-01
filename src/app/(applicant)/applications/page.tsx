import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { EmptyState } from "@/components/shared/page-states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDeadline } from "@/modules/grants/components/grant-card";
import { translate, formatCurrency as formatMoney, formatDate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { getCurrentProfile } from "@/lib/auth/server";
import { listApplicationsForApplicant } from "@/modules/applications";

export const metadata = { title: "My applications | Team Avengers" };

type ApplicationRow = Awaited<ReturnType<typeof listApplicationsForApplicant>>[number];

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  // Server-side guest guard (defense in depth behind the proxy + layout
  // guard): My Applications is never rendered for unauthenticated visitors.
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) redirect("/login?next=%2Fapplications");
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const params = await searchParams;
  const allApplications = await listApplicationsForApplicant().catch(() => [] as ApplicationRow[]);
  const activeStatus = params.status && (APPLICATION_STATUS_FILTERS as readonly string[]).includes(params.status) ? params.status : null;
  const applications = activeStatus ? allApplications.filter((application) => application.status === activeStatus) : allApplications;

  const counts = {
    total: allApplications.length,
    active: allApplications.filter((application) => ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED"].includes(application.status)).length,
    approved: allApplications.filter((application) => application.status === "APPROVED").length,
    rejected: allApplications.filter((application) => application.status === "REJECTED").length,
  };

  return <ApplicantShell><main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("applications.workspaceLabel")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("applications.myApplicationsTitle")}</h1><p className="mt-3 text-muted-foreground">{t("applications.myApplicationsDescription")}</p>

    {counts.total > 0 && (
      <section aria-label={t("applications.statsOverview")} className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("applications.statsActive")} value={counts.active} />
        <StatCard label={t("applications.statsApproved")} value={counts.approved} />
        <StatCard label={t("applications.statsRejected")} value={counts.rejected} />
      </section>
    )}

    {counts.total > 3 && (
      <nav aria-label={t("applications.filterLabel")} className="mt-6 flex flex-wrap gap-2">
        <FilterPill href="/applications" label={t("applications.filterAll")} active={!activeStatus} />
        {APPLICATION_STATUS_FILTERS.map((status) => (
          <FilterPill key={status} href={`/applications?status=${status}`} label={t(STATUS_FILTER_KEYS[status])} active={activeStatus === status} />
        ))}
      </nav>
    )}

    {applications.length > 0 ? <div className="mt-6 space-y-3">{applications.map((application) => {
      const grant = application.grants as { title?: string; funding_amount?: number | null; funding_currency?: string | null; application_deadline?: string | null } | null;
      return <Card key={application.id} className="transition-shadow hover:shadow-md"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{grant?.title ?? t("applications.grant")}</h2><StatusBadge status={application.status} /></div>
          <p className="mt-1 text-sm text-muted-foreground">{formatMoney(locale, grant?.funding_amount ?? null, grant?.funding_currency ?? null)} · {formatDeadline(grant?.application_deadline ?? null, locale)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{t("applications.updated")} {formatDate(locale, application.updated_at)}</span>
          {application.status === "DRAFT" ? <Badge variant="outline">{t("applications.draft")}</Badge> : null}
        </div>
      </CardContent></Card>;
    })}</div> : <div className="mt-8">{activeStatus
      ? <EmptyState title={t("applications.filterEmptyTitle")} description={t("applications.filterEmptyDescription")} action={<Link href="/applications" className="text-sm font-semibold text-primary hover:underline">{t("applications.filterClear")}</Link>} />
      : <EmptyState title={t("applications.emptyTitle")} description={t("applications.emptyDescription")} action={<Link href="/grants" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Search className="size-4" />{t("applications.browseOpenGrants")}</Link>} />}</div>}
  </main></ApplicantShell>;
}

const APPLICATION_STATUS_FILTERS = ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED", "APPROVED", "REJECTED"] as const;
const STATUS_FILTER_KEYS: Record<(typeof APPLICATION_STATUS_FILTERS)[number], Parameters<typeof translate>[1]> = {
  SUBMITTED: "statusLabels.application.SUBMITTED",
  UNDER_REVIEW: "statusLabels.application.UNDER_REVIEW",
  CORRECTION_REQUESTED: "statusLabels.application.CORRECTION_REQUESTED",
  APPROVED: "statusLabels.application.APPROVED",
  REJECTED: "statusLabels.application.REJECTED",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(16,35,61,0.04)]"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>;
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return <Link href={href} className={`inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</Link>;
}
