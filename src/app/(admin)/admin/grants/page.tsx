import Link from "next/link";
import { Plus } from "lucide-react";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState, LoadingState } from "@/components/shared/page-states";
import { GrantStatusBadge, type GrantStatusName } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { translate, formatDate, formatCurrency } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { Select } from "@/components/ui/select";
import { listGrantsAdminAction } from "@/modules/users/actions/admin-actions";
import { GRANT_STATUSES } from "@/modules/grants/types";

export const metadata = { title: "Grants | Platform administration" };
export const dynamic = "force-dynamic";

const STATUS_KEYS: Record<string, Parameters<typeof translate>[1]> = { DRAFT: "adminUi.draftStatus", PUBLISHED: "adminUi.publishedStatus", CLOSED: "adminUi.closedStatus", ARCHIVED: "adminUi.archivedStatus" };

export default async function AdminGrantsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const grants = await listGrantsAdminAction({ search: params.search, status: params.status }).catch(() => null);

  return (
    <PageContainer>
      <PageHeader
        title={t("adminUi.grantsTitle")}
        description={t("adminUi.grantsDescription")}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/grants/new" className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4" />{t("municipality.newGrant")}
            </Link>
            <Link href="/admin" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.backToAdmin")}</Link>
          </div>
        }
      />
      <Section title={t("adminUi.grantsSectionTitle")} description={t("adminUi.grantsSectionDescription")}>
        <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
          <label className="min-w-56 flex-1 text-sm font-medium">
            {t("adminUi.search")}
            <Input type="search" name="search" defaultValue={params.search ?? ""} placeholder={t("adminUi.searchByTitle")} className="mt-1" />
          </label>
          <label className="text-sm font-medium">
            {t("adminUi.status")}
            <Select name="status" defaultValue={params.status ?? ""} className="mt-1 w-44">
              <option value="">{t("adminUi.allStatuses")}</option>
              {GRANT_STATUSES.map((status) => (
                <option key={status} value={status}>{t(STATUS_KEYS[status])}</option>
              ))}
            </Select>
          </label>
          <button type="submit" className="min-h-10 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted">{t("adminUi.filter")}</button>
          {(params.search || params.status) && (
            <Link href="/admin/grants" className="min-h-10 inline-flex items-center rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground">{t("adminUi.clearFilter")}</Link>
          )}
        </form>
        {!grants ? (
          <LoadingState />
        ) : grants.length === 0 ? (
          <EmptyState title={t("adminUi.noGrantsTitle")} description={params.search || params.status ? t("adminUi.noGrantsFiltered") : t("adminUi.noGrantsYet")} action={<Link href="/admin/grants/new" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("municipality.createGrant")}</Link>} />
        ) : (
          <DataTable
            rows={grants}
            emptyMessage={t("adminUi.noGrantsTitle")}
            columns={[
              {
                key: "title",
                header: t("adminUi.grantColumn"),
                cell: (grant) => (
                  <div>
                    <Link href={`/admin/grants/${grant.id}`} className="font-semibold text-primary hover:underline">{grant.title}</Link>
                    <p className="text-xs text-muted-foreground">{grant.municipalityName ?? "—"}</p>
                  </div>
                ),
              },
              { key: "status", header: t("adminUi.status"), cell: (grant) => <GrantStatusBadge status={grant.status as GrantStatusName} /> },
              { key: "funding", header: t("adminUi.fundingColumn"), cell: (grant) => <span className="whitespace-nowrap">{formatCurrency(locale, grant.fundingAmount, grant.fundingCurrency ?? "EUR")}</span> },
              { key: "deadline", header: t("adminUi.deadlineColumn"), cell: (grant) => <span className="whitespace-nowrap text-xs">{formatDate(locale, grant.deadline)}</span> },
              { key: "applications", header: t("adminUi.applicationsColumn"), cell: (grant) => <span className="font-semibold">{grant.applicationCount}</span> },
            ]}
          />
        )}
      </Section>
    </PageContainer>
  );
}
