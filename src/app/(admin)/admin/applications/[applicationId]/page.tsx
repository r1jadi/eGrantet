import { ArrowLeft, FileText, Landmark, Mail, ShieldCheck, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentStatus } from "@/components/shared/document-status";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/page-states";
import { PageHeader, Section } from "@/components/shared/layout";
import { MunicipalReviewActions } from "@/modules/applications/components/municipal-review-actions";
import { MunicipalAppealReview } from "@/modules/applications/components/municipal-appeal-review";
import { getAppealForMunicipalityAction } from "@/modules/applications/actions/appeal-actions";
import { MunicipalLetterPanel } from "@/modules/applications/components/municipal-letter-panel";
import { MunicipalSummaryPanel } from "@/modules/applications/components/municipal-summary-panel";
import { getMunicipalApplicationDetail, getStoredApplicationSummary, listMunicipalApplicationChecks, listMunicipalApplicationDocuments } from "@/modules/applications";
import { MunicipalityEvaluations } from "@/modules/evaluations/components/municipality-evaluations";
import { getMunicipalityEvaluationSummary } from "@/modules/evaluations";
import { VerificationPanel, type VerificationPanelDocument, type VerificationPanelRequirement } from "@/modules/verification/components/verification-panel";
import { AdminAiReviewSection } from "@/modules/verification/components/admin-ai-review";
import { AdminWorkflowTimeline } from "@/modules/applications/components/admin-workflow-timeline";
import {
  getVerificationOverview,
  listDocumentVerificationStatuses,
  listRequirementVerifications,
} from "@/modules/verification";
import { listApplicationAuditTrail, type AuditTrailEntry } from "@/modules/audit/services/audit-query-service";
import { translate, formatCurrency, formatDate, formatDateTime, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import type { ApplicationStatus } from "@/modules/applications";
import type { EligibilityResult } from "@/modules/eligibility";

export const metadata = { title: "Review application | Platform administration" };
export const dynamic = "force-dynamic";

/** Statuses in which a decision letter can be generated/sent (deciding happens from UNDER_REVIEW; decided apps may receive a copy). */
const DECIDABLE_STATUSES = ["UNDER_REVIEW", "APPROVED", "REJECTED"];

const checkResultConfig: Record<EligibilityResult, { labelKey: TranslationKey; className: string }> = {
  PENDING: { labelKey: "adminUi.eligibilityPending", className: "bg-warning-background text-warning" },
  PASSED: { labelKey: "adminUi.eligibilityPassed", className: "bg-success-background text-success" },
  FAILED: { labelKey: "adminUi.eligibilityFailed", className: "bg-destructive-background text-destructive" },
};

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Renders a compact key/value summary of applicant answers, skipping internal answer keys. */
function answerEntries(answers: Record<string, unknown>, t: (key: TranslationKey) => string): Array<[string, string]> {
  const labels: Record<string, TranslationKey> = {
    organisationName: "applicationsPage.answerOrganisation",
    organisationType: "applicationsPage.answerOrganisationType",
    registrationNumber: "applicationsPage.answerRegistrationNumber",
    yearEstablished: "applicationsPage.answerYearEstablished",
    contactName: "applicationsPage.answerContactPerson",
    contactEmail: "applicationsPage.answerContactEmail",
    contactPhone: "applicationsPage.answerPhone",
    contactRole: "applicationsPage.answerContactRole",
    projectTitle: "applicationsPage.answerProjectTitle",
    projectSummary: "applicationsPage.answerProjectSummary",
    projectDescription: "applicationsPage.answerProjectDescription",
    communityImpact: "applicationsPage.answerCommunityImpact",
    expectedReach: "applicationsPage.answerExpectedReach",
    projectStart: "applicationsPage.answerProjectStart",
    budgetAmount: "applicationsPage.answerBudgetRequested",
  };
  return Object.entries(answers)
    .filter(([key, value]) => labels[key] !== undefined && typeof value === "string" && value.trim())
    .map(([key, value]) => [t(labels[key]), value as string] as [string, string]);
}

export default async function AdminApplicationReviewPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const locale = await getServerLocale();
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  let detail: Awaited<ReturnType<typeof getMunicipalApplicationDetail>>;
  let documents: Awaited<ReturnType<typeof listMunicipalApplicationDocuments>>;
  let checks: Awaited<ReturnType<typeof listMunicipalApplicationChecks>>;
  let storedSummary: Awaited<ReturnType<typeof getStoredApplicationSummary>>;
  let evaluationSummary: Awaited<ReturnType<typeof getMunicipalityEvaluationSummary>>;
  let verificationOverview: Awaited<ReturnType<typeof getVerificationOverview>>;
  let verificationDocuments: Awaited<ReturnType<typeof listDocumentVerificationStatuses>>;
  let verificationRequirements: Awaited<ReturnType<typeof listRequirementVerifications>>;
  let auditTrail: Awaited<ReturnType<typeof listApplicationAuditTrail>> = [];
  const appeal = await getAppealForMunicipalityAction(applicationId).catch(() => null);
  try {
    [detail, documents, checks, storedSummary, evaluationSummary, verificationOverview, verificationDocuments, verificationRequirements] = await Promise.all([
      getMunicipalApplicationDetail(applicationId),
      listMunicipalApplicationDocuments(applicationId),
      listMunicipalApplicationChecks(applicationId),
      getStoredApplicationSummary(applicationId),
      getMunicipalityEvaluationSummary(applicationId),
      getVerificationOverview(applicationId),
      listDocumentVerificationStatuses(applicationId),
      listRequirementVerifications(applicationId),
    ]);
    auditTrail = await listApplicationAuditTrail(applicationId).catch(() => [] as AuditTrailEntry[]);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const answers = answerEntries(detail.answers, t);

  const localizedAction = (action: string): string => {
    const key = `audit.${action}`;
    const translated = translate(locale, key as Parameters<typeof translate>[1]);
    return translated === key ? action.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : translated;
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link href="/admin/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />{t("adminUi.applicationsTitle")}
      </Link>
      <div className="mt-4">
        <PageHeader
          title={detail.grant.title}
          description={`${t("applications.submitted")} ${formatDateTime(locale, detail.submittedAt)} · ${t("municipality.referencePrefix")} ${detail.id.slice(0, 8).toUpperCase()}`}
          actions={<StatusBadge status={detail.status} />}
        />
      </div>

      {/* Where the application currently sits in the workflow */}
      <AdminWorkflowTimeline
        status={detail.status}
        checks={checks}
        verification={verificationOverview ? { status: verificationOverview.status, completedAt: verificationOverview.completed_at } : null}
        evaluations={{ total: evaluationSummary.evaluations.length, submitted: evaluationSummary.evaluations.filter((entry) => entry.status === "SUBMITTED").length }}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          <Section title={t("verification.panelTitle")} description={t("municipality.verificationSectionDesc")}>
            <VerificationPanel
              applicationId={detail.id}
              overview={
                verificationOverview
                  ? {
                      status: verificationOverview.status,
                      summary: verificationOverview.summary,
                      errorMessage: verificationOverview.error_message,
                      inconsistencies: verificationOverview.inconsistencies as Array<{ note?: string; field?: string; applicationValue?: string | null; documentValue?: string | null }>,
                      missingDocumentRequirementNames: [],
                      completedAt: verificationOverview.completed_at,
                    }
                  : null
              }
              documents={verificationDocuments.map((document): VerificationPanelDocument => ({
                id: document.id,
                fileName: document.fileName,
                documentType: document.documentType,
                status: document.status,
                confidence: document.confidence,
                notes: document.notes,
                inconsistencies: document.inconsistencies,
              }))}
              requirements={verificationRequirements.map((requirement): VerificationPanelRequirement => ({
                id: requirement.id,
                name: requirement.requirementName,
                type: requirement.requirementType,
                isRequired: requirement.isRequired,
                result: requirement.result,
                source: requirement.source,
                explanation: requirement.explanation,
                evidence: requirement.evidence,
                confidence: requirement.confidence,
              }))}
              missingRequirementNames={[]}
            />
          </Section>

          {/* Deep AI review: extracted fields, findings, what could not be verified */}
          <AdminAiReviewSection
            documents={verificationDocuments.map((document) => ({
              id: document.id,
              fileName: document.fileName,
              documentType: document.documentType,
              status: document.status,
              confidence: document.confidence,
              notes: document.notes,
              inconsistencies: document.inconsistencies,
            }))}
            requirements={verificationRequirements}
            overview={verificationOverview ? { summary: verificationOverview.summary, completedAt: verificationOverview.completed_at } : null}
          />

          <Section title={t("ai.summaryTitle")} description={t("ai.summaryDescription")}>
            <Card>
              <CardContent className="p-5">
                <MunicipalSummaryPanel
                  applicationId={detail.id}
                  initialSummary={storedSummary?.summary ?? null}
                  initialGeneratedAt={storedSummary?.generatedAt ?? null}
                />
              </CardContent>
            </Card>
          </Section>

          <Section title={t("municipality.applicationInfoTitle")}>
            <Card>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <DetailRow icon={Landmark} label={t("applications.grant")} value={detail.grant.title} />
                <DetailRow icon={Wallet} label={t("municipality.requestedColumn")} value={detail.grant.fundingAmount !== null ? formatCurrency(locale, detail.grant.fundingAmount, detail.grant.fundingCurrency) : t("municipality.amountNotSpecified")} />
                <DetailRow icon={ShieldCheck} label={t("municipality.grantStatusLabel")} value={detail.grant.status === "PUBLISHED" ? t("grants.openForApplications") : detail.grant.status} />
                <DetailRow icon={Mail} label={t("municipality.referencePrefix")} value={detail.id.slice(0, 8).toUpperCase()} />
              </CardContent>
            </Card>
          </Section>

          <Section title={t("municipality.applicantInfoTitle")}>
            <Card>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <DetailRow icon={UserRound} label={t("adminUi.applicantColumn")} value={detail.applicant.fullName ?? t("municipality.unnamedApplicant")} />
                <DetailRow icon={Landmark} label={t("applicationsPage.answerOrganisation")} value={detail.applicant.organisation ?? t("municipality.notProvided")} />
                <DetailRow icon={Mail} label={t("auth.email")} value={detail.applicant.email ?? t("municipality.notProvided")} />
              </CardContent>
            </Card>
          </Section>

          {answers.length > 0 && (
            <Section title={t("municipality.applicationAnswersTitle")}>
              <Card>
                <CardContent className="p-5">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {answers.map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                        <dd className="mt-1 whitespace-pre-line text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </Section>
          )}

          <Section title={t("municipality.submittedDocsTitle")}>
            {documents.length === 0 ? (
              <EmptyState title={t("applicationsPage.noDocumentsYet")} description={t("municipality.noDocsDescription")} />
            ) : (
              <ul className="space-y-3">
                {documents.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><FileText className="size-4" aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{document.fileName}</p>
                        <p className="text-xs text-muted-foreground">{document.documentType} · {formatFileSize(document.fileSizeBytes)} · {formatDate(locale, document.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`/api/documents/${document.id}`} className="inline-flex min-h-8 items-center rounded-md border px-3 text-sm font-medium text-primary hover:bg-muted">{t("common.open")}</a>
                      <DocumentStatus status={document.status === "UPLOADED" ? "UPLOADED" : document.status === "REPLACEMENT_REQUESTED" ? "FLAGGED" : "REJECTED"} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("municipality.validationStatusTitle")} description={t("municipality.validationStatusDesc")}>
            {checks.length === 0 ? (
              <EmptyState title={t("municipality.noChecksTitle")} description={t("municipality.noChecksDescription")} />
            ) : (
              <ul className="space-y-3">
                {checks.map((check) => {
                  const config = checkResultConfig[check.result];
                  return (
                    <li key={check.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{check.requirementId ? `${t("municipality.requirementPrefix")} ${check.requirementId.slice(0, 8).toUpperCase()}` : t("municipality.overallEligibility")}</p>
                        {check.reason && <p className="mt-0.5 text-sm text-muted-foreground">{check.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>{t(config.labelKey)}</span>
                        <Badge variant="outline">{formatDate(locale, check.checkedAt)}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title={t("municipality.auditHistoryTitle")} description={t("municipality.auditHistoryDesc")}>
            {auditTrail.length === 0 ? (
              <EmptyState title={t("municipality.noAuditTitle")} description={t("municipality.noAuditDescription")} />
            ) : (
              <ul className="space-y-2">
                {auditTrail.slice(0, 20).map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm">
                    <span className="font-medium">{localizedAction(entry.action)}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(locale, entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8">
          {appeal && (
            <MunicipalAppealReview
              appealId={appeal.id}
              applicationId={detail.id}
              status={appeal.status}
              reason={appeal.reason}
              explanation={appeal.explanation}
              decisionNote={appeal.decisionNote}
            />
          )}
          <MunicipalityEvaluations
            applicationId={detail.id}
            assignments={evaluationSummary.assignments}
            evaluations={evaluationSummary.evaluations}
          />
          <Card>
            <CardHeader><CardTitle>{t("municipality.reviewActionsTitle")}</CardTitle></CardHeader>
            <CardContent><MunicipalReviewActions applicationId={detail.id} status={detail.status as ApplicationStatus} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("ai.letterPanelTitle")}</CardTitle></CardHeader>
            <CardContent>
              <MunicipalLetterPanel
                applicationId={detail.id}
                disabled={!DECIDABLE_STATUSES.includes(detail.status as ApplicationStatus)}
                disabledReason={t("municipality.letterDisabledReason")}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("municipality.applicationStatusTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center justify-between gap-3">{t("municipality.createdLabel")} <span className="font-medium text-foreground">{formatDate(locale, detail.createdAt)}</span></p>
              <p className="flex items-center justify-between gap-3">{t("applications.submitted")} <span className="font-medium text-foreground">{formatDate(locale, detail.submittedAt)}</span></p>
              <p className="flex items-center justify-between gap-3">{t("adminUi.updatedColumn")} <span className="font-medium text-foreground">{formatDate(locale, detail.updatedAt)}</span></p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Landmark; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
