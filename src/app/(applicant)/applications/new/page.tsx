import Link from "next/link";
import { redirect } from "next/navigation";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { EmptyState } from "@/components/shared/page-states";
import { PageContainer } from "@/components/shared/layout";
import { ApplicationFlow, type WizardApplication } from "@/modules/applications";
import { createDraftApplication, getApplicationForCurrentUser, listApplicationsForApplicant } from "@/modules/applications";
import { getPublicDirectoryGrantDetail } from "@/modules/grants";
import { getCurrentProfile } from "@/lib/auth/server";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "New application | eGrantet" };
export const dynamic = "force-dynamic";

/**
 * Wizard entry point. The draft is created (or resumed) server-side before
 * render: one draft per applicant/grant is enforced by the database, so an
 * existing draft for this grant is continued instead of creating a duplicate.
 */
export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<{ grant?: string }> }) {
  const { grant: grantId } = await searchParams;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/applications/new?grant=${grantId ?? ""}`)}`);
  if (!grantId) redirect("/grants");

  let wizardGrant: Awaited<ReturnType<typeof getPublicDirectoryGrantDetail>>;
  try {
    wizardGrant = await getPublicDirectoryGrantDetail(grantId);
  } catch {
    return (
      <PageContainer>
        <EmptyState title={t("grants.notFoundTitle")} description={t("grants.notFoundMessage")} action={<Link href="/grants" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("grants.backToGrants")}</Link>} />
      </PageContainer>
    );
  }
  if (!wizardGrant.applicationAvailable) {
    return (
      <PageContainer>
        <EmptyState title={t("grants.deadlinePassed")} description={t("grants.notFoundMessage")} action={<Link href="/grants" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("grants.backToGrants")}</Link>} />
      </PageContainer>
    );
  }

  let draft: WizardApplication;
  try {
    const existing = (await listApplicationsForApplicant()).find((application) => {
      const grantIdOfRow = (application as { grant_id?: string }).grant_id;
      return grantIdOfRow === wizardGrant.id && (application.status === "DRAFT" || application.status === "CORRECTION_REQUESTED");
    });
    const applicationRow = existing ?? await createDraftApplication(wizardGrant.id);
    const full = await getApplicationForCurrentUser((applicationRow as { id: string }).id);
    const { listDocumentsForApplication } = await import("@/modules/documents/services/document-listing-service");
    const documents = await listDocumentsForApplication((applicationRow as { id: string }).id);
    draft = {
      id: full.id,
      status: full.status,
      submittedAt: full.submitted_at ?? null,
      answers: (full.answers ?? {}) as Record<string, unknown>,
      documents: documents.map((document) => ({ id: document.id, requirementId: document.requirementId, fileName: document.fileName, fileSizeBytes: document.fileSizeBytes })),
    };
  } catch (error) {
    const message = error instanceof AppError ? error.message : toSafeErrorMessage(error);
    return (
      <PageContainer>
        <EmptyState title={message} description={t("errors.genericRetry")} action={<Link href="/grants" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("grants.backToGrants")}</Link>} />
      </PageContainer>
    );
  }

  return (
    <ApplicationFlow
      grant={{
        id: wizardGrant.id,
        title: wizardGrant.title,
        description: wizardGrant.description,
        fundingAmount: wizardGrant.fundingAmount,
        fundingCurrency: wizardGrant.fundingCurrency,
        applicationDeadline: wizardGrant.applicationDeadline,
        municipalityName: wizardGrant.municipalityName,
        requirements: wizardGrant.requirements,
      }}
      application={draft}
    />
  );
}
