import Link from "next/link";
import { PageContainer } from "@/components/shared/layout";
import { ArrowRight, FolderKanban, Layers } from "lucide-react";
import { MunicipalApplicationList } from "@/modules/applications/components/municipal-application-list";
import { getMunicipalApplicationStats, listMunicipalApplications } from "@/modules/applications";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/page-states";
import { GrantStatusBadge } from "@/components/shared/status-badge";
import { SectionHeading, StatCard } from "@/modules/grants/components/municipality-sections";
import { getMunicipalityDashboardStats, listMunicipalitiesForCurrentUser } from "@/modules/grants";
import { listMunicipalityGranteeProjects } from "@/modules/grantee";
import { getCurrentProfile } from "@/lib/auth/server";
import { translate, formatDate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Municipality dashboard | eGrantet" };
export const dynamic = "force-dynamic";

export default async function MunicipalityDashboardPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [profile, stats, municipalities, applicationStats, applications, projects] = await Promise.all([
    getCurrentProfile(),
    getMunicipalityDashboardStats(),
    listMunicipalitiesForCurrentUser(),
    getMunicipalApplicationStats(),
    listMunicipalApplications(),
    listMunicipalityGranteeProjects().catch(() => []),
  ]);
  const municipalityName = municipalities.map((municipality) => municipality.name).join(", ") || t("municipality.yourMunicipality");
  const recentApplications = applications.slice(0, 5);
  const attentionProjects = projects.filter((project) => project.overdueCount > 0 || project.stalled);
  const reviewTotal = Math.max(applicationStats.total, 1);
  const reviewProgress = Math.round(((applicationStats.inReview + applicationStats.approved + applicationStats.rejected) / reviewTotal) * 100);

  return <PageContainer>
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-primary"><span className="h-px w-5 bg-primary" />{municipalityName}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("municipality.dashboardWelcome").replace("{name}", (profile?.fullName ?? "").split(" ")[0] || t("municipality.colleague"))}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("municipality.dashboardSubtitle")}</p>
      </div>
      <Link href="/municipality/grants/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">{t("municipality.createGrant")} <ArrowRight className="size-4" aria-hidden="true" /></Link>
    </header>

    <section aria-label={t("municipality.applicationReviewOverview")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t("municipality.totalGrants")} value={stats.total} hint={t("municipality.published").toLowerCase() + `: ${stats.published}`} href="/municipality/grants" />
      <StatCard label={t("municipality.statsTotal")} value={applicationStats.total} hint={t("municipality.latestSubmissions")} href="/municipality/applications" />
      <StatCard label={t("municipality.statsReadyForReview")} value={applicationStats.readyForReview} hint={t("municipality.openReviewQueue")} href="/municipality/applications" />
      <StatCard label={t("municipality.projectsNeedingAttention")} value={attentionProjects.length} hint={t("municipality.allProjects")} href="/municipality/projects" />
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="rounded-xl border bg-card shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4"><div><h2 className="text-lg font-bold tracking-tight">{t("municipality.latestSubmissions")}</h2><p className="mt-0.5 text-sm text-muted-foreground">{t("municipality.latestSubmissionsDescription")}</p></div><Link href="/municipality/applications" className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-secondary">{t("municipality.openReviewQueue")}<ArrowRight className="size-4" /></Link></div>
        <div className="p-0">{recentApplications.length === 0 ? <div className="p-5"><EmptyState title={t("municipality.noApplicationsYet")} description={t("municipality.noApplicationsDescription")} /></div> : <MunicipalApplicationList applications={recentApplications} />}</div>
      </div>
      <aside className="space-y-5">
        <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,35,61,0.04)]"><div className="flex items-center justify-between"><h2 className="font-bold tracking-tight">{t("municipality.applicationReviewOverview")}</h2><span className="text-sm font-bold text-primary">{reviewProgress}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${reviewProgress}%` }} /></div><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("municipality.statsReadyForReview")}</dt><dd className="font-semibold">{applicationStats.readyForReview}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("municipality.statsInReview")}</dt><dd className="font-semibold">{applicationStats.inReview}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("municipality.statsApproved")}</dt><dd className="font-semibold">{applicationStats.approved}</dd></div></dl></div>
        <Link href="/municipality/projects" className="block rounded-xl bg-[#102f4f] p-5 text-white shadow-sm transition hover:bg-[#0d2945]"><FolderKanban className="size-5 text-[#b9dcf5]" /><h2 className="mt-4 font-bold tracking-tight">{t("municipality.projectsNeedingAttention")}</h2><p className="mt-2 text-sm leading-5 text-blue-100">{attentionProjects.length > 0 ? `${attentionProjects.length} ${t("municipality.projectsNeedingAttention").toLowerCase()}` : t("municipality.nothingNeedsAttentionDescription")}</p><span className="mt-5 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-[#dff8e8] px-3 text-sm font-semibold text-[#125c3c]">{t("municipality.allProjects")} <ArrowRight className="ml-1 size-4" /></span></Link>
      </aside>
    </section>

    <section aria-label={t("municipality.recentGrants")} className="mt-6 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
      <SectionHeading icon={Layers} title={t("municipality.recentGrants")} description={t("municipality.recentGrantsDescription")} action={<Link href="/municipality/grants" className="inline-flex min-h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">{t("municipality.allGrants")}</Link>} />
      <div className="mt-4">{stats.recentGrants.length === 0 ? <EmptyState title={t("municipality.noGrantsYet")} description={t("municipality.noGrantsDescription")} action={<Link href="/municipality/grants/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("municipality.createGrant")}</Link>} /> : <DataTable rows={stats.recentGrants} emptyMessage={t("municipality.noRecordsYet")} columns={[{ key: "title", header: t("municipality.grantColumn"), cell: (grant) => <Link href={`/municipality/grants/${grant.id}`} className="font-semibold text-primary hover:underline">{grant.title}</Link> }, { key: "status", header: t("municipality.statusColumn"), cell: (grant) => <GrantStatusBadge status={grant.status} /> }, { key: "applications", header: t("municipality.applicationsColumn"), cell: (grant) => String(grant.applicationCount) }, { key: "updated", header: t("municipality.updatedColumn"), cell: (grant) => formatDate(locale, grant.updatedAt) }]} />}</div>
    </section>
  </PageContainer>;
}
