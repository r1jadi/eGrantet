import { Plus } from "lucide-react";
import { PageContainer } from "@/components/shared/layout";
import Link from "next/link";
import { DataTable } from "@/components/shared/data-table";
import { GrantStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/page-states";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { formatDeadline } from "@/modules/grants/components/grant-card";
import { translate, formatCurrency, formatDate, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { listMunicipalityGrants } from "@/modules/grants";
import { GRANT_STATUSES } from "@/modules/grants/types";

export const metadata = { title: "Manage grants | eGrantet" };

const statusLabelKeys: Record<string, TranslationKey> = { DRAFT: "municipality.drafts", PUBLISHED: "municipality.published", CLOSED: "municipality.closed", ARCHIVED: "municipality.archived" };

type SearchParams = Promise<{ search?: string; status?: string; page?: string }>;

export default async function MunicipalityGrantsPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getServerLocale();
  const t = (key: TranslationKey) => translate(locale, key);
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const status = params.status && (GRANT_STATUSES as readonly string[]).includes(params.status) ? (params.status as (typeof GRANT_STATUSES)[number]) : undefined;
  const result = await listMunicipalityGrants({ search: params.search, status, page, pageSize: 10 });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const buildPageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (status) query.set("status", status);
    if (targetPage > 1) query.set("page", String(targetPage));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return `/municipality/grants${suffix}`;
  };

  return <PageContainer>
    <SectionHeading title={t("municipality.grantsTitle")} description={`${result.total} ${t("grants.grantsAvailable")}`} action={<Link href="/municipality/grants/new" className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="size-4" />{t("municipality.newGrant")}</Link>} />

    <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
      <label className="min-w-56 flex-1 text-sm font-medium">{t("common.search")}<Input type="search" name="search" defaultValue={params.search ?? ""} placeholder={t("municipality.searchByTitle")} className="mt-1" /></label>
      <label className="text-sm font-medium">{t("applications.status")}<Select name="status" defaultValue={status ?? ""} className="mt-1 w-40"><option value="">{t("municipality.allStatuses")}</option>{GRANT_STATUSES.map((option) => <option key={option} value={option}>{t(statusLabelKeys[option])}</option>)}</Select></label>
      <button type="submit" className="inline-flex min-h-10 items-center rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted">{t("municipality.apply")}</button>
    </form>

    <div className="mt-6">
      {result.items.length === 0 ? <EmptyState title={t("municipality.noGrantsFound")} description={params.search || status ? t("municipality.tryDifferentFilter") : t("municipality.noGrantsDescription")} action={!params.search && !status ? <Link href="/municipality/grants/new" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("municipality.createGrant")}</Link> : undefined} /> : <DataTable
        rows={result.items}
        emptyMessage={t("municipality.noGrantsFound")}
        columns={[
          { key: "title", header: t("municipality.grantColumn"), cell: (grant) => <Link href={`/municipality/grants/${grant.id}`} className="font-semibold text-primary hover:underline">{grant.title}</Link> },
          { key: "municipality", header: t("municipality.municipalityColumn"), cell: (grant) => (grant.municipalities as { name?: string } | null)?.name ?? "—" },
          { key: "status", header: t("municipality.statusColumn"), cell: (grant) => <GrantStatusBadge status={grant.status} /> },
          { key: "funding", header: t("grants.funding"), cell: (grant) => formatCurrency(locale, grant.funding_amount, grant.funding_currency) },
          { key: "deadline", header: t("applications.deadline"), cell: (grant) => formatDeadline(grant.application_deadline, locale) },
          { key: "created", header: t("municipality.createdColumn"), cell: (grant) => formatDate(locale, grant.created_at) },
        ]}
      />}
    </div>

    {totalPages > 1 && <nav aria-label={t("municipality.pagination")} className="mt-5 flex items-center justify-between text-sm">
      {page > 1 ? <Link className="rounded-md border px-3 py-2 hover:bg-muted" href={buildPageHref(page - 1)}>{t("common.previous")}</Link> : <span />}
      <span className="text-muted-foreground">{t("municipality.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}</span>
      {page < totalPages ? <Link className="rounded-md border px-3 py-2 hover:bg-muted" href={buildPageHref(page + 1)}>{t("common.next")}</Link> : <span />}
    </nav>}
  </PageContainer>;
}
