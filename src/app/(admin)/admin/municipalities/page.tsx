import Link from "next/link";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { LoadingState } from "@/components/shared/page-states";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { listMunicipalitiesAdminAction } from "@/modules/users/actions/admin-actions";
import { MunicipalityManager } from "@/modules/users/components/municipality-manager";

export const metadata = { title: "Municipalities | Platform administration" };
export const dynamic = "force-dynamic";

export default async function AdminMunicipalitiesPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const municipalities = await listMunicipalitiesAdminAction().catch(() => null);
  return (
    <PageContainer>
      <PageHeader
        title={t("adminUi.municipalitiesPageTitle")}
        description={t("adminUi.municipalitiesDescription")}
        actions={<Link href="/admin" className="text-sm font-semibold text-primary hover:underline">{t("adminUi.backToAdmin")}</Link>}
      />
      <Section title={t("adminUi.municipalitiesSectionTitle")} description={t("adminUi.municipalitiesSectionDescription")}>
        {!municipalities ? <LoadingState /> : <MunicipalityManager municipalities={municipalities} />}
      </Section>
    </PageContainer>
  );
}
