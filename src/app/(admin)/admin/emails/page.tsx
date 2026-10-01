import Link from "next/link";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState, LoadingState } from "@/components/shared/page-states";
import { Select } from "@/components/ui/select";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { listEmailDeliveriesAdminAction } from "@/modules/users/actions/admin-actions";

export const metadata = { title: "Email delivery | Platform administration" };
export const dynamic = "force-dynamic";

const STATUSES = ["", "SENT", "FAILED", "PENDING", "SKIPPED"] as const;

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-success-background text-success",
  FAILED: "bg-destructive-background text-destructive",
  PENDING: "bg-warning-background text-warning",
  SKIPPED: "bg-muted text-muted-foreground",
};

const STATUS_BADGE_KEYS: Record<string, Parameters<typeof translate>[1]> = { SENT: "adminUi.sentLabel", FAILED: "adminUi.failedLabel", PENDING: "adminUi.pendingStatus", SKIPPED: "adminUi.skippedStatus" };
const STATUS_OPTION_KEYS = STATUS_BADGE_KEYS;

export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const deliveries = await listEmailDeliveriesAdminAction({ status: params.status || undefined }).catch(() => null);
  const counts = deliveries
    ? {
        sent: deliveries.filter((d) => d.status === "SENT").length,
        failed: deliveries.filter((d) => d.status === "FAILED").length,
        skipped: deliveries.filter((d) => d.status === "SKIPPED").length,
      }
    : { sent: 0, failed: 0, skipped: 0 };

  return (
    <PageContainer>
      <PageHeader
        title={t("adminUi.emailDeliveryTitle")}
        description={t("adminUi.emailDeliveryDescription")}
        actions={<Link href="/admin" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.backToAdmin")}</Link>}
      />
      <Section title={t("adminUi.deliveriesSectionTitle")} description={t("adminUi.deliveriesSectionDescription")}>
        {!deliveries ? (
          <LoadingState />
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-card px-5 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("adminUi.sentLabel")}</p><p className="mt-1 text-2xl font-bold text-success">{counts.sent}</p></div>
              <div className="rounded-xl border bg-card px-5 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("adminUi.failedLabel")}</p><p className="mt-1 text-2xl font-bold text-destructive">{counts.failed}</p></div>
              <div className="rounded-xl border bg-card px-5 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("adminUi.skippedLabel")}</p><p className="mt-1 text-2xl font-bold text-muted-foreground">{counts.skipped}</p></div>
            </div>
            <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
              <label className="text-sm font-medium">
                {t("adminUi.status")}
                <Select name="status" defaultValue={params.status ?? ""} className="mt-1 w-44">
                  {STATUSES.map((status) => (
                    <option key={status || "all"} value={status}>{status === "" ? t("adminUi.allStatuses") : (STATUS_OPTION_KEYS[status] ? t(STATUS_OPTION_KEYS[status]) : status)}</option>
                  ))}
                </Select>
              </label>
              <button type="submit" className="min-h-10 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted">{t("adminUi.filter")}</button>
              {params.status && <Link href="/admin/emails" className="min-h-10 inline-flex items-center rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground">{t("adminUi.clearFilter")}</Link>}
            </form>
            {deliveries.length === 0 ? (
              <EmptyState title={t("adminUi.noEmailsTitle")} description={params.status ? t("adminUi.noEmailsFiltered") : t("adminUi.noEmailsYet")} />
            ) : (
              <DataTable
                rows={deliveries}
                emptyMessage={t("adminUi.noEmailsTitle")}
                columns={[
                  { key: "recipient", header: t("adminUi.recipientColumn"), cell: (delivery) => <span className="font-medium">{delivery.recipientEmail}</span> },
                  { key: "category", header: t("adminUi.categoryColumn"), cell: (delivery) => <span className="text-xs">{delivery.category}</span> },
                  {
                    key: "status",
                    header: t("adminUi.status"),
                    cell: (delivery) => (
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[delivery.status] ?? "bg-muted"}`}>{STATUS_BADGE_KEYS[delivery.status] ? t(STATUS_BADGE_KEYS[delivery.status]) : delivery.status}</span>
                    ),
                  },
                  {
                    key: "error",
                    header: t("adminUi.detailColumn"),
                    cell: (delivery) => <span className="text-xs text-muted-foreground">{delivery.errorMessage ?? "—"}</span>,
                  },
                  {
                    key: "when",
                    header: t("adminUi.createdColumn"),
                    cell: (delivery) => <span className="whitespace-nowrap text-xs text-muted-foreground">{new Date(delivery.createdAt).toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>,
                  },
                ]}
              />
            )}
          </>
        )}
      </Section>
    </PageContainer>
  );
}
