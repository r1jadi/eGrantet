import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  ClipboardList,
  FileText,
  Gavel,
  Landmark,
  Mail,
  ScrollText,
  Users,
} from "lucide-react";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { EmptyState } from "@/components/shared/page-states";
import {
  getNeedsAttentionAdminAction,
  getPlatformStatsAdminAction,
  listApplicationsAdminAction,
  listAuditLogsAdminAction,
  listEmailDeliveriesAdminAction,
  listGrantsAdminAction,
  type NeedsAttentionResult,
} from "@/modules/users/actions/admin-actions";
import { translate, formatDate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Platform administration | Team Avengers" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, unknown>) => translate(locale, key, values);

  const [stats, grants, applicationPage, emails, audit, attention] = await Promise.all([
    getPlatformStatsAdminAction(),
    listGrantsAdminAction().catch(() => [] as Awaited<ReturnType<typeof listGrantsAdminAction>>),
    listApplicationsAdminAction({ pageSize: 100 }).catch(() => ({ rows: [] as Awaited<ReturnType<typeof listApplicationsAdminAction>>["rows"], total: 0, page: 1, pageSize: 100 })),
    listEmailDeliveriesAdminAction().catch(() => [] as Awaited<ReturnType<typeof listEmailDeliveriesAdminAction>>),
    listAuditLogsAdminAction({ limit: 8 }).catch(() => [] as Awaited<ReturnType<typeof listAuditLogsAdminAction>>),
    getNeedsAttentionAdminAction().catch(() => ({ awaitingReview: [], verificationNeedsReview: [], correctionRequested: [], verificationFailed: [] } as NeedsAttentionResult)),
  ]);
  const applications = applicationPage.rows;

  const applicationByStatus = APPLICATION_STATUS_ORDER.map((status) => ({
    status,
    label: t(STATUS_KEYS[status]),
    count: applications.filter((application) => application.status === status).length,
  }));
  const maxApplicationStatus = Math.max(1, ...applicationByStatus.map((entry) => entry.count));
  const reviewable = applications.filter((application) => application.status === "SUBMITTED" || application.status === "UNDER_REVIEW").length;
  const decided = applications.filter((application) => application.status === "APPROVED" || application.status === "REJECTED").length;
  const decisionRate = applications.length > 0 ? Math.round((decided / applications.length) * 100) : 0;
  const emailCounts = {
    sent: emails.filter((delivery) => delivery.status === "SENT").length,
    failed: emails.filter((delivery) => delivery.status === "FAILED").length,
    skipped: emails.filter((delivery) => delivery.status === "SKIPPED").length,
  };
  const grantByStatus = GRANT_STATUS_ORDER.map((status) => ({
    status,
    label: t(GRANT_STATUS_KEYS[status]),
    count: grants.filter((grant) => grant.status === status).length,
  }));

  const localizedAction = (action: string): string => {
    const key = `audit.${action}`;
    const translated = translate(locale, key as Parameters<typeof translate>[1]);
    // Unknown actions fall back to a readable rendering of the raw action.
    return translated === key ? action.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : translated;
  };
  const localizedEntity = (entityType: string): string => {
    const key = ENTITY_TYPE_KEYS[entityType];
    return key ? t(key) : entityType.replaceAll("_", " ");
  };

  const managementLinks = [
    { href: "/admin/users", icon: Users, title: t("adminUi.usersPageTitle"), description: t("adminUi.accountsSectionDescription") },
    { href: "/admin/municipalities", icon: Building2, title: t("adminUi.municipalitiesPageTitle"), description: t("adminUi.municipalitiesSectionDescription") },
    { href: "/admin/grants", icon: Landmark, title: t("adminUi.grantsQuickLink"), description: t("adminUi.grantsQuickLinkDescription") },
    { href: "/admin/applications", icon: ClipboardList, title: t("adminUi.applicationsTitle"), description: t("adminUi.applicationsQuickLinkDescription") },
    { href: "/admin/evaluations", icon: Gavel, title: t("adminUi.evaluationsQuickLink"), description: t("adminUi.evaluationsQuickLinkDescription") },
    { href: "/admin/emails", icon: Mail, title: t("adminUi.emailDeliveryTitle"), description: t("adminUi.emailDeliveryDescription") },
    { href: "/admin/audit", icon: ScrollText, title: t("adminUi.auditPageTitle"), description: t("adminUi.auditDescription") },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />

      {/* Platform counters */}
      <section aria-label={t("admin.overviewTitle")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label={t("admin.municipalities")} value={stats.municipalities} href="/admin/municipalities" />
        <StatCard icon={Landmark} label={t("admin.grants")} value={stats.grants} href="/admin/grants" />
        <StatCard icon={ClipboardList} label={t("admin.applications")} value={stats.applications} href="/admin/applications" />
        <StatCard icon={Users} label={t("admin.users")} value={stats.users} href="/admin/users" />
      </section>

      {/* Operational snapshot */}
      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-xl border bg-card shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t("adminUi.pipelineTitle")}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("adminUi.pipelineDescription")}</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{t("adminUi.decided", { percent: decisionRate })}</span>
          </div>
          <div className="space-y-3 px-5 py-5">
            {applicationByStatus.map((entry) => (
              <div key={entry.status} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs font-semibold text-muted-foreground">{entry.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${entry.count > 0 ? STATUS_BAR_COLORS[entry.status] : ""}`} style={{ width: `${Math.round((entry.count / maxApplicationStatus) * 100)}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-bold tabular-nums">{entry.count}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 border-t px-5 py-4 text-sm">
            <span className="text-muted-foreground">{t("adminUi.inReviewNow", { count: reviewable })}</span>
            <span className="text-muted-foreground">{t("adminUi.grantsPublished", { count: grantByStatus.find((entry) => entry.status === "PUBLISHED")?.count ?? 0 })}</span>
            <Link href="/admin/applications" className="ml-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline">{t("adminUi.openApplications")} <ArrowRight className="size-4" /></Link>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="font-bold tracking-tight">{t("adminUi.emailDeliveryTitle")}</h2>
              <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("adminUi.sentLabel")}</dt><dd className="font-bold text-success">{emailCounts.sent}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("adminUi.failedLabel")}</dt><dd className="font-bold text-destructive">{emailCounts.failed}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("adminUi.skippedLabel")}</dt><dd className="font-bold text-muted-foreground">{emailCounts.skipped}</dd></div>
            </dl>
            <Link href="/admin/emails" className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg border text-sm font-semibold hover:bg-muted">{t("adminUi.deliveryLog")}</Link>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
            <h2 className="font-bold tracking-tight">{t("adminUi.grantLifecycleTitle")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {grantByStatus.map((entry) => (
                <li key={entry.status} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{entry.label}</span>
                  <span className="font-bold tabular-nums">{entry.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Needs-attention operational queue */}
      <section aria-label={t("adminUi.needsAttentionTitle")} className="mt-6 rounded-xl border bg-card shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{t("adminUi.needsAttentionTitle")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("adminUi.needsAttentionDescription")}</p>
          </div>
          <Link href="/admin/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("adminUi.viewAllLink")} <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4 sm:divide-x">
          <AttentionColumn
            title={t("adminUi.attentionSubmitted")}
            tone="primary"
            applications={attention.awaitingReview}
            href="/admin/applications?status=SUBMITTED"
            emptyHint={t("adminUi.noApplicationsYet")}
            labelReady={t("adminUi.applicationsTitle")}
          />
          <AttentionColumn
            title={t("adminUi.attentionVerification")}
            tone="warning"
            applications={attention.verificationNeedsReview}
            href="/admin/applications"
            emptyHint={t("adminUi.noApplicationsYet")}
            labelReady={t("adminUi.applicationsTitle")}
          />
          <AttentionColumn
            title={t("adminUi.attentionCorrection")}
            tone="muted"
            applications={attention.correctionRequested}
            href="/admin/applications?status=CORRECTION_REQUESTED"
            emptyHint={t("adminUi.noApplicationsYet")}
            labelReady={t("adminUi.applicationsTitle")}
          />
          <AttentionColumn
            title={t("adminUi.attentionFailed")}
            tone="destructive"
            applications={attention.verificationFailed}
            href="/admin/applications"
            emptyHint={t("adminUi.noApplicationsYet")}
            labelReady={t("adminUi.applicationsTitle")}
          />
        </div>
      </section>

      {/* Recent platform activity */}
      <section aria-label={t("adminUi.recentActivityTitle")} className="mt-6 rounded-xl border bg-card shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{t("adminUi.recentActivityTitle")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("adminUi.recentActivityDescription")}</p>
          </div>
          <Link href="/admin/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><Activity className="size-4" /> {t("adminUi.fullAuditTrail")}</Link>
        </div>
        {audit.length === 0 ? (
          <div className="p-5"><EmptyState title={t("adminUi.noActivityTitle")} description={t("adminUi.noActivityYet")} /></div>
        ) : (
          <ul className="divide-y">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{localizedAction(entry.action)}</p>
                  <p className="text-xs text-muted-foreground">{localizedEntity(entry.entityType)}{entry.actorName ? ` · ${entry.actorName}` : ""}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(locale, entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Management center */}
      <section aria-label={t("admin.managementTitle")} className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <BellRing className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight">{t("admin.managementTitle")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {managementLinks.map((link) => (
            <Link key={link.href} href={link.href} className="group rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,35,61,0.04)] transition hover:border-primary/40 hover:shadow-md">
              <link.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-bold tracking-tight">{link.title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{link.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition group-hover:opacity-100">{t("adminUi.manage")} <ArrowRight className="size-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-secondary/40 p-5">
        <h2 className="font-bold tracking-tight">{t("admin.accessTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{t("admin.accessDescription")}</p>
      </section>
    </PageContainer>
  );
}

const APPLICATION_STATUS_ORDER = ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED", "APPROVED", "REJECTED", "WITHDRAWN", "DRAFT"] as const;
const STATUS_KEYS: Record<string, Parameters<typeof translate>[1]> = {
  SUBMITTED: "adminUi.submittedStatus", UNDER_REVIEW: "adminUi.underReviewStatus", CORRECTION_REQUESTED: "adminUi.correctionStatus",
  APPROVED: "adminUi.approvedStatus", REJECTED: "adminUi.rejectedStatus", WITHDRAWN: "adminUi.withdrawnStatus", DRAFT: "adminUi.draftStatus",
};
const STATUS_BAR_COLORS: Record<string, string> = {
  SUBMITTED: "bg-primary", UNDER_REVIEW: "bg-blue-500", CORRECTION_REQUESTED: "bg-amber-500",
  APPROVED: "bg-green-600", REJECTED: "bg-red-500", WITHDRAWN: "bg-gray-400", DRAFT: "bg-gray-300",
};
const ENTITY_TYPE_KEYS: Record<string, Parameters<typeof translate>[1]> = {
  appeal: "audit.entityAppeal",
  application: "audit.entityApplication",
  grant: "audit.entityGrant",
  grant_requirement: "audit.entityGrantRequirement",
  evaluation_criterion: "audit.entityEvaluationCriterion",
  business_profiles: "audit.entityBusinessDocument",
  document: "audit.entityDocument",
  evaluation: "audit.entityEvaluation",
  milestone: "audit.entityMilestone",
  municipality: "audit.entityMunicipality",
  user: "audit.entityUser",
  decision_letter: "audit.entityDecisionLetter",
  project: "audit.entityProject",
};

const GRANT_STATUS_ORDER = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;
const GRANT_STATUS_KEYS: Record<string, Parameters<typeof translate>[1]> = {
  DRAFT: "adminUi.draftStatus", PUBLISHED: "adminUi.publishedStatus", CLOSED: "adminUi.closedStatus", ARCHIVED: "adminUi.archivedStatus",
};

const ATTENTION_TONE_STYLES: Record<string, string> = {
  primary: "text-primary",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

function AttentionColumn({ title, tone, applications, href, emptyHint, labelReady }: { title: string; tone: string; applications: Array<{ id: string; applicantName: string | null; applicantOrganisation: string | null; grantTitle: string }>; href: string; emptyHint: string; labelReady: string }) {
  return (
    <div className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${ATTENTION_TONE_STYLES[tone] ?? ""}`}>{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">{applications.length}</span>
      </div>
      {applications.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {applications.slice(0, 3).map((application) => (
            <li key={application.id} className="min-w-0">
              <Link href={`/admin/applications/${application.id}`} className="block truncate text-sm font-medium hover:text-primary hover:underline">
                {application.applicantName ?? application.applicantOrganisation ?? application.id.slice(0, 8).toUpperCase()}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{application.grantTitle}</p>
            </li>
          ))}
        </ul>
      )}
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{labelReady} <ArrowRight className="size-3" /></Link>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, href }: { icon: typeof Users; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(16,35,61,0.04)] transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </Link>
  );
}
