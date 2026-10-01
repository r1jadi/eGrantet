import { CalendarDays, ClipboardList, ListChecks, Scale, Wallet } from "lucide-react";
import { PageContainer } from "@/components/shared/layout";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { GrantStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDeadline } from "@/modules/grants/components/grant-card";
import { CriteriaManager, LifecycleControls, RequirementsManager } from "@/modules/grants/components/municipality-forms";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { getGrantForManagement } from "@/modules/grants";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Manage grant | Team Avengers" };

type ManagementData = Awaited<ReturnType<typeof getGrantForManagement>>;
type GrantRow = ManagementData["grant"];
type RequirementRow = ManagementData["requirements"][number];

export default async function GrantManagementPage({ params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = await params;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, unknown>) => translate(locale, key, values);
  let data: ManagementData;
  try {
    data = await getGrantForManagement(grantId);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) notFound();
    throw error;
  }
  const grant = data.grant as GrantRow;
  const editable = grant.status === "DRAFT";
  const municipalityName = (grant.municipalities as { name?: string } | null)?.name ?? t("municipality.areaName");
  const requirements = data.requirements as unknown as RequirementRow[];
  const deadlinePassed = grant.application_deadline ? new Date(grant.application_deadline) <= new Date() : false;

  return <PageContainer>
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{municipalityName}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{grant.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2"><GrantStatusBadge status={grant.status} />{editable && <Badge variant="outline">{t("grantForms.reqEditableDraft")}</Badge>}{deadlinePassed && grant.status === "PUBLISHED" && <Badge variant="warning">{t("grants.deadlinePassed")}</Badge>}</div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Link href={`/municipality/grants/${grant.id}/edit`} className="inline-flex min-h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">{t("municipality.editGrant")}</Link>
        <LifecycleControls grantId={grant.id} status={grant.status} />
      </div>
    </header>

    <section aria-label={t("municipality.grantOverview")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="flex items-center gap-3 p-5"><Wallet className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("grants.availableFunding")}</p><p className="font-semibold">{formatCurrency(grant.funding_amount, grant.funding_currency)}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-5"><CalendarDays className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("applications.deadline")}</p><p className="font-semibold">{formatDeadline(grant.application_deadline)}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-5"><ClipboardList className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("municipality.applicationsColumn")}</p><p className="font-semibold">{data.totalApplications}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-5"><ListChecks className="size-5 text-primary" aria-hidden="true" /><div><p className="text-sm text-muted-foreground">{t("municipality.requirements")}</p><p className="font-semibold">{requirements.length}</p></div></CardContent></Card>
    </section>

    {Object.keys(data.applicationCounts).length > 0 && <section className="mt-4 flex flex-wrap gap-2">{Object.entries(data.applicationCounts).map(([status, count]) => <span key={status} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm"><StatusBadge status={status as Parameters<typeof StatusBadge>[0]["status"]} /><span className="font-semibold">{count}</span></span>)}</section>}

    {grant.description && <section className="mt-6 rounded-xl border bg-card p-5"><p className="text-sm font-semibold">{t("grantForms.grantFormDescription")}</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{grant.description}</p></section>}

    <section className="mt-9">
      <SectionHeading icon={ListChecks} title={t("municipality.requirements")} description={t("grantForms.reqSectionDesc")} />
      <div className="mt-4"><RequirementsManager grantId={grant.id} editable={editable} requirements={requirements} /></div>
    </section>

    <section className="mt-9">
      <SectionHeading icon={Scale} title={t("municipality.criteria")} description={t("grantForms.critSectionDesc")} />
      <div className="mt-4"><CriteriaManager grantId={grantId} editable={editable} criteria={data.criteria} /></div>
    </section>
  </PageContainer>;
}
