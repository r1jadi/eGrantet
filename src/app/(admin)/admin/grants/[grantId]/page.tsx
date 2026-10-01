import { CalendarDays, ClipboardList, Landmark, ListChecks, Scale, ScrollText, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { PageContainer } from "@/components/shared/layout";
import { GrantStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDeadline } from "@/modules/grants/components/grant-card";
import { formatCurrency as formatCurrencyI18n } from "@/lib/i18n";
import { CriteriaManager, LifecycleControls, RequirementsManager } from "@/modules/grants/components/municipality-forms";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { getGrantForManagement } from "@/modules/grants";
import { getGrantApplicationStatsAdminAction, getGrantVerificationStatsAdminAction, listGrantActivityAdminAction } from "@/modules/users/actions/admin-actions";
import { translate, formatDate, formatDateTime, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Manage grant | Platform administration" };
export const dynamic = "force-dynamic";

type ManagementData = Awaited<ReturnType<typeof getGrantForManagement>>;

export default async function AdminGrantManagementPage({ params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = await params;
  const locale = await getServerLocale();
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  let data: ManagementData;
  try {
    data = await getGrantForManagement(grantId);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) notFound();
    throw error;
  }
  const [appStats, verificationStats, activity] = await Promise.all([
    getGrantApplicationStatsAdminAction(grantId).catch(() => []),
    getGrantVerificationStatsAdminAction(grantId).catch(() => null),
    listGrantActivityAdminAction(grantId, 15).catch(() => []),
  ]);

  const grant = data.grant;
  const editable = grant.status === "DRAFT";
  const municipalityName = (grant.municipalities as { name?: string } | null)?.name ?? t("municipality.areaName");
  const deadlinePassed = grant.application_deadline ? new Date(grant.application_deadline) <= new Date() : false;

  const localizedAction = (action: string): string => {
    const key = `audit.${action}`;
    const translated = translate(locale, key as Parameters<typeof translate>[1]);
    return translated === key ? action.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : translated;
  };

  return (
    <PageContainer>
      <Link href="/admin/grants" className="text-sm font-semibold text-primary hover:underline">← {t("adminUi.grantsTitle")}</Link>
      <header className="mt-3 mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary"><Landmark className="size-4" aria-hidden="true" />{municipalityName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{grant.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <GrantStatusBadge status={grant.status} />
            {editable && <Badge variant="outline">{t("grantForms.reqEditableDraft")}</Badge>}
            {deadlinePassed && grant.status === "PUBLISHED" && <Badge variant="warning">{t("grants.deadlinePassed")}</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Link href={`/admin/grants/${grant.id}/edit`} className="inline-flex min-h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">{t("municipality.editGrant")}</Link>
            <Link href={`/grants/${grant.id}`} className="inline-flex min-h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">{t("common.view")}</Link>
          </div>
          <LifecycleControls grantId={grant.id} status={grant.status} basePath="/admin/grants" />
        </div>
      </header>

      <section aria-label={t("municipality.grantOverview")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-5"><Wallet className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("grants.availableFunding")}</p><p className="font-semibold">{formatCurrencyI18n(locale, grant.funding_amount, grant.funding_currency)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><CalendarDays className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("applications.deadline")}</p><p className="font-semibold">{formatDeadline(grant.application_deadline, locale)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><ClipboardList className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("municipality.applicationsColumn")}</p><p className="font-semibold">{data.totalApplications}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><ListChecks className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("municipality.requirements")}</p><p className="font-semibold">{data.requirements.length}</p></div></CardContent></Card>
      </section>

      {/* Applications received by status — each chip links to the filtered admin queue */}
      <section className="mt-4 flex flex-wrap gap-2">
        {appStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adminUi.noApplicationsYet")}</p>
        ) : (
          appStats.map((entry) => (
            <Link key={entry.status} href={`/admin/applications?grantId=${grant.id}&status=${entry.status}`} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm hover:border-primary/40">
              <StatusBadge status={entry.status as Parameters<typeof StatusBadge>[0]["status"]} />
              <span className="font-semibold">{entry.count}</span>
            </Link>
          ))
        )}
        {data.totalApplications > 0 && (
          <Link href={`/admin/applications?grantId=${grant.id}`} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-primary hover:bg-secondary/80">{t("adminUi.applicationsSectionTitle")}</Link>
        )}
      </section>

      {grant.description && (
        <section className="mt-6 rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold">{t("grantForms.grantFormDescription")}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{grant.description}</p>
        </section>
      )}

      {/* AI / document verification statistics */}
      {verificationStats && verificationStats.totalApplications > 0 && (
        <section className="mt-6">
          <SectionHeading icon={ScrollText} title={t("adminUi.aiVerificationStatsTitle")} description={t("adminUi.aiVerificationStatsDescription")} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.overview.COMPLETED")}</p><p className="mt-1 text-2xl font-bold text-success">{verificationStats.verificationsCompleted}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.overview.NEEDS_REVIEW")}</p><p className="mt-1 text-2xl font-bold text-warning">{verificationStats.verificationsNeedsReview}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.overview.FAILED")}</p><p className="mt-1 text-2xl font-bold text-destructive">{verificationStats.verificationsFailed}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("adminUi.flaggedDocsLabel")}</p><p className="mt-1 text-2xl font-bold">{verificationStats.documentsFlagged}/{verificationStats.documentsTotal}</p></CardContent></Card>
          </div>
        </section>
      )}

      <section className="mt-9">
        <SectionHeading icon={ListChecks} title={t("municipality.requirements")} description={t("grantForms.reqSectionDesc")} />
        <div className="mt-4"><RequirementsManager grantId={grant.id} editable={editable} requirements={data.requirements} /></div>
      </section>

      <section className="mt-9">
        <SectionHeading icon={Scale} title={t("municipality.criteria")} description={t("grantForms.critSectionDesc")} />
        <div className="mt-4"><CriteriaManager grantId={grant.id} editable={editable} criteria={data.criteria} /></div>
      </section>

      {/* Grant + application audit activity */}
      <section className="mt-9 rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight"><ScrollText className="size-4 text-primary" aria-hidden="true" />{t("adminUi.grantActivityTitle")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("adminUi.grantActivityDescription")}</p>
          </div>
        </div>
        {activity.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">{t("adminUi.noAuditYet")}</div>
        ) : (
          <ul className="divide-y">
            {activity.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{localizedAction(entry.action)}</p>
                  <p className="text-xs text-muted-foreground">{entry.actorName ?? t("audit.system")}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(locale, entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
