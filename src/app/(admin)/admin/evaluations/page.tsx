import Link from "next/link";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { translate, formatDate, formatNumber } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState, LoadingState } from "@/components/shared/page-states";
import { listEvaluationsAdminAction } from "@/modules/users/actions/admin-actions";

export const metadata = { title: "Evaluations | Platform administration" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-foreground",
  SUBMITTED: "bg-success-background text-success",
};

export default async function AdminEvaluationsPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const evaluations = await listEvaluationsAdminAction().catch(() => null);

  return (
    <PageContainer>
      <PageHeader
        title={t("adminUi.evaluationsTitle")}
        description={t("adminUi.evaluationsDescription")}
        actions={<Link href="/admin" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.backToAdmin")}</Link>}
      />
      <Section title={t("adminUi.evaluationsSectionTitle")} description={t("adminUi.evaluationsSectionDescription")}>
        {!evaluations ? (
          <LoadingState />
        ) : evaluations.length === 0 ? (
          <EmptyState title={t("adminUi.noEvaluationsTitle")} description={t("adminUi.noEvaluationsYet")} />
        ) : (
          <DataTable
            rows={evaluations}
            emptyMessage={t("adminUi.noEvaluationsTitle")}
            columns={[
              { key: "grant", header: t("adminUi.grantColumn"), cell: (evaluation) => <span className="font-semibold">{evaluation.grantTitle}</span> },
              {
                key: "evaluator",
                header: t("adminUi.evaluatorColumn"),
                cell: (evaluation) => <span>{evaluation.evaluatorName ?? "—"}</span>,
              },
              {
                key: "status",
                header: t("adminUi.status"),
                cell: (evaluation) => (
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[evaluation.status] ?? "bg-muted text-foreground"}`}>{evaluation.status === "SUBMITTED" ? t("adminUi.submittedStatus") : t("adminUi.draftStatus")}</span>
                ),
              },
              {
                key: "score",
                header: t("adminUi.totalScoreColumn"),
                cell: (evaluation) => <span className="font-semibold">{evaluation.totalScore !== null ? formatNumber(locale, evaluation.totalScore) : "—"}</span>,
              },
              {
                key: "application",
                header: t("adminUi.applicationColumn"),
                cell: (evaluation) => (
                  <Link href="/admin/applications" className="text-xs font-semibold text-primary hover:underline">{t("adminUi.viewQueue")}</Link>
                ),
              },
              {
                key: "updated",
                header: t("adminUi.updatedColumn"),
                cell: (evaluation) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(locale, evaluation.updatedAt)}</span>,
              },
            ]}
          />
        )}
      </Section>
    </PageContainer>
  );
}
