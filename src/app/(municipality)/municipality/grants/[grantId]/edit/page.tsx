import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shared/layout";
import { AppError } from "@/lib/errors/app-error";
import { GrantForm } from "@/modules/grants/components/municipality-forms";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { getGrantForManagement } from "@/modules/grants";

export const metadata = { title: "Edit grant | eGrantet" };

export default async function EditGrantPage({ params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = await params;
  let data: Awaited<ReturnType<typeof getGrantForManagement>>;
  try {
    data = await getGrantForManagement(grantId);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) notFound();
    throw error;
  }
  const grant = data.grant;
  const editable = grant.status === "DRAFT";

  return <PageContainer>
    <SectionHeading title={editable ? `Edit “${grant.title}”` : `View “${grant.title}”`} description={editable ? "Changes are saved to the draft." : "This grant is no longer a draft and can no longer be edited."} />
    <div className="mt-6 max-w-3xl">
      {editable ? <GrantForm mode="edit" grantId={grant.id} municipalityName={(grant.municipalities as { name?: string } | null)?.name ?? null} initialValues={{ title: grant.title, description: grant.description, fundingAmount: grant.funding_amount === null ? "" : String(grant.funding_amount), maximumAmountPerApplicant: grant.maximum_amount_per_applicant === null ? "" : String(grant.maximum_amount_per_applicant), fundingCurrency: grant.funding_currency ?? "", applicationDeadline: grant.application_deadline ?? "" }} /> : <p className="rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">Only draft grants can be edited.</p>}
    </div>
  </PageContainer>;
}
