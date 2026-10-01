import { GrantForm } from "@/modules/grants/components/municipality-forms";
import { PageContainer } from "@/components/shared/layout";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { listMunicipalitiesForCurrentUser } from "@/modules/grants";

export const metadata = { title: "New grant | Team Avengers" };

export default async function NewGrantPage() {
  const municipalities = await listMunicipalitiesForCurrentUser();

  return <PageContainer>
    <SectionHeading title="Create a grant" description="The grant is created as a private draft; publish it when it is ready." />
    <div className="mt-6 max-w-3xl">
      <GrantForm mode="create" initialValues={{ title: "", description: "", fundingAmount: "", maximumAmountPerApplicant: "", fundingCurrency: "EUR", applicationDeadline: "" }} municipalityName={municipalities.map((municipality) => municipality.name).join(", ") || null} />
    </div>
  </PageContainer>;
}
