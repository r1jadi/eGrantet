import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { PageContainer } from "@/components/shared/layout";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { GrantForm } from "@/modules/grants/components/municipality-forms";
import { listAllMunicipalitiesAdminAction } from "@/modules/users/actions/admin-actions";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "New grant | Platform administration" };
export const dynamic = "force-dynamic";

export default async function AdminNewGrantPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const municipalities = await listAllMunicipalitiesAdminAction();

  if (municipalities.length === 0) {
    notFound();
  }

  return (
    <PageContainer>
      <SectionHeading title={t("municipality.createGrant")} description={t("municipality.createGrantDescription")} />
      <div className="mt-6 max-w-2xl">
        <GrantForm
          mode="create"
          municipalities={municipalities}
          basePath="/admin/grants"
          initialValues={{ title: "", description: "", fundingAmount: "", maximumAmountPerApplicant: "", fundingCurrency: "EUR", applicationDeadline: "" }}
        />
      </div>
    </PageContainer>
  );
}
