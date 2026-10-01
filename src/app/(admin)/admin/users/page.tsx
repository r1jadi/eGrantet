import Link from "next/link";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { LoadingState } from "@/components/shared/page-states";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { listUsersAdminAction } from "@/modules/users/actions/admin-actions";
import { UserManagerTable } from "@/modules/users/components/user-manager-table";

export const metadata = { title: "Users | Platform administration" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const users = await listUsersAdminAction(q).catch(() => null);
  return (
    <PageContainer>
      <PageHeader
        title={t("adminUi.usersPageTitle")}
        description={t("adminUi.usersDescription")}
        actions={<Link href="/admin" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.backToAdmin")}</Link>}
      />
      <Section title={t("adminUi.accountsSectionTitle")} description={t("adminUi.accountsSectionDescription")}>
        <form className="mb-4 flex max-w-md gap-2" action="/admin/users">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("adminUi.searchUsersPlaceholder")}
            className="min-h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            aria-label={t("adminUi.searchUsersLabel")}
          />
          <button type="submit" className="min-h-10 shrink-0 rounded-lg border px-4 text-sm font-semibold hover:bg-muted">
            {t("adminUi.search")}
          </button>
        </form>
        {!users ? <LoadingState /> : <UserManagerTable users={users} />}
      </Section>
    </PageContainer>
  );
}
