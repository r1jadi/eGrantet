import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { PageContainer } from "@/components/shared/layout";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { GrantForm } from "@/modules/grants/components/municipality-forms";
import { getGrantForManagement } from "@/modules/grants";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Edit grant | Platform administration" };
export const dynamic = "force-dynamic";

export default async function AdminEditGrantPage({ params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = await params;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  let grant: Awaited<ReturnType<typeof getGrantForManagement>>["grant"];
  try {
    ({ grant } = await getGrantForManagement(grantId));
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) notFound();
    throw error;
  }

  const deadlineInput = grant.application_deadline ? grant.application_deadline.slice(0, 16) : "";

  return (
    <PageContainer>
      <SectionHeading title={t("municipality.editGrant")} description={grant.title} />
      <div className="mt-6 max-w-2xl">
        <GrantForm
          mode="edit"
          grantId={grant.id}
          basePath="/admin/grants"
          initialValues={{
            title: grant.title,
            description: grant.description ?? "",
            fundingAmount: grant.funding_amount === null ? "" : String(grant.funding_amount),
            maximumAmountPerApplicant: grant.maximum_amount_per_applicant === null ? "" : String(grant.maximum_amount_per_applicant),
            fundingCurrency: grant.funding_currency ?? "EUR",
            applicationDeadline: deadlineInput,
          }}
        />
      </div>
    </PageContainer>
  );
}
