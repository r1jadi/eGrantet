import Link from "next/link";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState, LoadingState } from "@/components/shared/page-states";
import { StatusBadge, type ApplicationStatusName } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { translate, formatDate, formatCurrency, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { Select } from "@/components/ui/select";
import { listApplicationsAdminAction, listGrantsAdminAction } from "@/modules/users/actions/admin-actions";
import { APPLICATION_STATUSES } from "@/modules/applications/types";

export const metadata = { title: "Applications | Platform administration" };
export const dynamic = "force-dynamic";

const STATUS_KEYS: Record<string, TranslationKey> = {
  DRAFT: "adminUi.draftStatus", SUBMITTED: "adminUi.submittedStatus", UNDER_REVIEW: "adminUi.underReviewStatus",
  CORRECTION_REQUESTED: "adminUi.correctionStatus", APPROVED: "adminUi.approvedStatus", REJECTED: "adminUi.rejectedStatus", WITHDRAWN: "adminUi.withdrawnStatus",
};

const ELIGIBILITY_STYLES: Record<string, string> = {
  PASSED: "bg-success-background text-success",
  FAILED: "bg-destructive-background text-destructive",
  PENDING: "bg-warning-background text-warning",
  NONE: "bg-muted text-muted-foreground",
};

const VERIFICATION_STYLES: Record<string, string> = {
  COMPLETED: "bg-success-background text-success",
  NEEDS_REVIEW: "bg-warning-background text-warning",
  PROCESSING: "bg-warning-background text-warning",
  FAILED: "bg-destructive-background text-destructive",
  NOT_RUN: "bg-muted text-muted-foreground",
};

type SearchParams = Promise<{ search?: string; status?: string; grantId?: string; submittedBefore?: string; sort?: string; page?: string }>;

export default async function AdminApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const sort = params.sort === "submitted" ? "submitted" : params.sort === "created" ? "created" : "updated";
  const [result, grants] = await Promise.all([
    listApplicationsAdminAction({
      search: params.search,
      status: params.status,
      grantId: params.grantId,
      submittedBefore: params.submittedBefore,
      sort,
      page,
      pageSize: 20,
    }).catch(() => null),
    listGrantsAdminAction().catch(() => []),
  ]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const hasFilters = Boolean(params.search || params.status || params.grantId || params.submittedBefore);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { search: params.search, status: params.status, grantId: params.grantId, submittedBefore: params.submittedBefore, sort, page: String(page), ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "page" && value === "1") && !(key === "sort" && value === "updated")) query.set(key, value);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return `/admin/applications${suffix}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("adminUi.applicationsTitle")}
        description={t("adminUi.applicationsDescription")}
        actions={<Link href="/admin" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.backToAdmin")}</Link>}
      />
      <Section title={t("adminUi.applicationsSectionTitle")} description={t("adminUi.applicationsSectionDescription")}>
        <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
          <label className="min-w-52 flex-1 text-sm font-medium">
            {t("adminUi.search")}
            <Input type="search" name="search" defaultValue={params.search ?? ""} placeholder={t("adminUi.searchApplications")} className="mt-1" />
          </label>
          <label className="text-sm font-medium">
            {t("adminUi.status")}
            <Select name="status" defaultValue={params.status ?? ""} className="mt-1 w-44">
              <option value="">{t("adminUi.allStatuses")}</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>{t(STATUS_KEYS[status])}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            {t("adminUi.grantColumn")}
            <Select name="grantId" defaultValue={params.grantId ?? ""} className="mt-1 w-52">
              <option value="">{t("adminUi.allGrantsFilter")}</option>
              {grants.map((grant) => (
                <option key={grant.id} value={grant.id}>{grant.title}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            {t("adminUi.submittedBeforeLabel")}
            <Input type="date" name="submittedBefore" defaultValue={params.submittedBefore ?? ""} className="mt-1 w-44" />
          </label>
          <label className="text-sm font-medium">
            {t("adminUi.sortByLabel")}
            <Select name="sort" defaultValue={sort} className="mt-1 w-40">
              <option value="updated">{t("adminUi.sortUpdated")}</option>
              <option value="submitted">{t("adminUi.sortSubmitted")}</option>
              <option value="created">{t("adminUi.sortCreated")}</option>
            </Select>
          </label>
          <button type="submit" className="min-h-10 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted">{t("adminUi.filter")}</button>
          {hasFilters && (
            <Link href="/admin/applications" className="min-h-10 inline-flex items-center rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground">{t("adminUi.clearFilter")}</Link>
          )}
        </form>

        {!result ? (
          <LoadingState />
        ) : result.rows.length === 0 ? (
          <EmptyState title={t("adminUi.noApplicationsTitle")} description={hasFilters ? t("adminUi.noApplicationsFiltered") : t("adminUi.noApplicationsYet")} />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{t("adminUi.showingCount", { count: result.rows.length, total: result.total })}</p>
            <DataTable
              rows={result.rows}
              emptyMessage={t("adminUi.noApplicationsTitle")}
              columns={[
                {
                  key: "who",
                  header: t("adminUi.applicantColumn"),
                  cell: (application) => (
                    <div className="min-w-0">
                      <Link href={`/admin/applications/${application.id}`} className="font-semibold text-primary hover:underline">{application.applicantName ?? "—"}</Link>
                      <p className="truncate text-xs text-muted-foreground">{application.applicantOrganisation ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{application.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  ),
                },
                { key: "grant", header: t("adminUi.grantColumn"), cell: (application) => <div><p>{application.grantTitle}</p><p className="text-xs text-muted-foreground">{application.municipalityName ?? "—"}</p></div> },
                {
                  key: "amount",
                  header: t("adminUi.requestedColumn"),
                  cell: (application) => <span className="whitespace-nowrap">{application.requestedAmount !== null ? formatCurrency(locale, application.requestedAmount, "EUR") : "—"}</span>,
                },
                { key: "status", header: t("adminUi.status"), cell: (application) => <StatusBadge status={application.status as ApplicationStatusName} /> },
                {
                  key: "eligibility",
                  header: t("adminUi.eligibilityColumn"),
                  cell: (application) => (
                    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${ELIGIBILITY_STYLES[application.eligibility] ?? ELIGIBILITY_STYLES.NONE}`}>
                      {t(`adminUi.eligibility${application.eligibility.charAt(0)}${application.eligibility.slice(1).toLowerCase()}` as TranslationKey)}
                    </span>
                  ),
                },
                {
                  key: "verification",
                  header: t("adminUi.verificationColumn"),
                  cell: (application) => (
                    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${VERIFICATION_STYLES[application.verification] ?? VERIFICATION_STYLES.NOT_RUN}`}>
                      {t(`verification.overview.${application.verification}` as TranslationKey)}
                    </span>
                  ),
                },
                {
                  key: "evaluations",
                  header: t("adminUi.evaluationsColumn"),
                  cell: (application) => (
                    <span className="whitespace-nowrap text-sm">
                      {application.evaluationsTotal === 0 ? "—" : `${application.evaluationsSubmitted}/${application.evaluationsTotal}`}
                    </span>
                  ),
                },
                { key: "submitted", header: t("adminUi.submittedColumn"), cell: (application) => <span className="whitespace-nowrap text-xs">{formatDate(locale, application.submittedAt)}</span> },
                {
                  key: "actions",
                  header: <span className="sr-only">{t("common.open")}</span> as unknown as string,
                  cell: (application) => (
                    <Link href={`/admin/applications/${application.id}`} className="whitespace-nowrap text-sm font-semibold text-primary hover:underline">{t("municipality.review")}</Link>
                  ),
                },
              ]}
            />
            {totalPages > 1 && (
              <nav aria-label={t("municipality.pagination")} className="mt-5 flex items-center justify-between text-sm">
                {page > 1 ? <Link className="rounded-md border px-3 py-2 hover:bg-muted" href={buildHref({ page: String(page - 1) })}>{t("common.previous")}</Link> : <span />}
                <span className="text-muted-foreground">{t("municipality.pageOf", { page, total: totalPages })}</span>
                {page < totalPages ? <Link className="rounded-md border px-3 py-2 hover:bg-muted" href={buildHref({ page: String(page + 1) })}>{t("common.next")}</Link> : <span />}
              </nav>
            )}
          </>
        )}
      </Section>
    </PageContainer>
  );
}
