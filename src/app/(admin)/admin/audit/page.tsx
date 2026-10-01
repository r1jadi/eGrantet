import Link from "next/link";
import { translate, formatDateTime } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState, LoadingState } from "@/components/shared/page-states";
import { listAuditLogsAdminAction } from "@/modules/users/actions/admin-actions";

export const metadata = { title: "Audit trail | Platform administration" };
export const dynamic = "force-dynamic";

const ENTITY_TYPES = ["", "grant", "grant_requirement", "application", "user", "municipality", "business_profiles"] as const;

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

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const { entity } = await searchParams;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, unknown>) => translate(locale, key, values);
  const entries = await listAuditLogsAdminAction({ entityType: entity || undefined, limit: 200 }).catch(() => null);

  const localizedAction = (action: string): string => {
    const key = `audit.${action}`;
    const translated = translate(locale, key as Parameters<typeof translate>[1]);
    // Unknown actions (logged before this catalog existed) fall back to a
    // readable rendering of the raw action instead of the key itself.
    return translated === key ? action.replaceAll("_", " ").toLowerCase() : translated;
  };

  const localizedEntity = (entityType: string): string => {
    const key = ENTITY_TYPE_KEYS[entityType];
    return key ? t(key) : entityType.replaceAll("_", " ");
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("adminUi.auditPageTitle")}
        description={t("adminUi.auditDescription")}
        actions={<Link href="/admin" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.backToAdmin")}</Link>}
      />
      <Section title={t("adminUi.auditSectionTitle")} description={t("adminUi.auditSectionDescription")}>
        <form className="mb-4 flex flex-wrap gap-2" action="/admin/audit">
          <label className="sr-only" htmlFor="entity-filter">{t("adminUi.filterByEntity")}</label>
          <select
            id="entity-filter"
            name="entity"
            defaultValue={entity ?? ""}
            className="min-h-10 rounded-lg border bg-card px-3 py-2 text-sm"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>{type === "" ? t("adminUi.allEntityTypes") : localizedEntity(type)}</option>
            ))}
          </select>
          <button type="submit" className="min-h-10 rounded-lg border px-4 text-sm font-semibold hover:bg-muted">{t("adminUi.filter")}</button>
        </form>
        {!entries ? (
          <LoadingState />
        ) : entries.length === 0 ? (
          <EmptyState title={t("adminUi.noAuditTitle")} description={t("adminUi.noAuditYet")} />
        ) : (
          <DataTable
            rows={entries}
            emptyMessage={t("adminUi.noAuditTitle")}
            columns={[
              { key: "time", header: t("adminUi.whenColumn"), cell: (entry) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(locale, entry.createdAt)}</span> },
              { key: "action", header: t("adminUi.actionColumn"), cell: (entry) => <span className="font-semibold">{localizedAction(entry.action)}</span> },
              { key: "entity", header: t("adminUi.entityColumn"), cell: (entry) => <span className="text-xs">{localizedEntity(entry.entityType)}{entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}</span> },
              { key: "actor", header: t("adminUi.actorColumn"), cell: (entry) => <span className="text-xs">{entry.actorName ?? (entry.actorId ? entry.actorId.slice(0, 8) : t("audit.system"))}</span> },
              {
                key: "meta",
                header: t("adminUi.contextColumn"),
                cell: (entry) => {
                  const pairs = Object.entries(entry.metadata ?? {}).slice(0, 3);
                  return pairs.length ? <span className="text-xs text-muted-foreground">{pairs.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</span> : <span className="text-xs text-muted-foreground">—</span>;
                },
              },
            ]}
          />
        )}
      </Section>
    </PageContainer>
  );
}
