import { ArrowLeft, Check, CircleAlert, FileText, Circle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { PageContainer } from "@/components/shared/layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { getApplicationForCurrentUser } from "@/modules/applications";
import { getAppealForCurrentUserAction } from "@/modules/applications/actions/appeal-actions";
import { AppealSection } from "@/modules/applications/components/appeal-section";
import { getPublicDirectoryGrantDetail } from "@/modules/grants";
import { listDocumentsForApplication } from "@/modules/documents/services/document-listing-service";
import { translate, formatDate, formatCurrency, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Ordered lifecycle stages shown on the status timeline. */
const STAGES: Array<{ status: string; labelKey: TranslationKey }> = [
  { status: "SUBMITTED", labelKey: "applications.submitted" },
  { status: "UNDER_REVIEW", labelKey: "statusLabels.application.UNDER_REVIEW" },
  { status: "DECIDED", labelKey: "applications.decision" },
];

const STAGE_INDEX: Record<string, number> = { DRAFT: -1, SUBMITTED: 0, UNDER_REVIEW: 1, CORRECTION_REQUESTED: 1, APPROVED: 2, REJECTED: 2, DECIDED: 2, WITHDRAWN: -1 };

export default async function ApplicantApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const locale = await getServerLocale();
  const t = (key: TranslationKey) => translate(locale, key);

  let application: Awaited<ReturnType<typeof getApplicationForCurrentUser>>;
  try {
    application = await getApplicationForCurrentUser(applicationId);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) notFound();
    throw error;
  }
  const grantId = (application as { grant_id: string }).grant_id;
  let grant: Awaited<ReturnType<typeof getPublicDirectoryGrantDetail>> | null = null;
  try {
    grant = await getPublicDirectoryGrantDetail(grantId);
  } catch {
    grant = null;
  }
  const documents = await listDocumentsForApplication(application.id).catch(() => []);
  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const status = application.status as string;
  // Appeals: rejected applications can be appealed once, within 8 days.
  const appeal = status === "REJECTED" || status === "DECIDED" ? await getAppealForCurrentUserAction(application.id).catch(() => null) : null;
  const stageIndex = STAGE_INDEX[status] ?? -1;
  const isDraft = status === "DRAFT";
  const isRejected = status === "REJECTED";
  const currentStageLabel = isRejected ? t("statusLabels.application.REJECTED") : status === "APPROVED" ? t("statusLabels.application.APPROVED") : status === "CORRECTION_REQUESTED" ? t("statusLabels.application.CORRECTION_REQUESTED") : null;

  return (
    <ApplicantShell>
      <PageContainer>
        <Link href="/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />{t("nav.myApplications")}</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">{application.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{grant?.title ?? t("applications.grant")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {application.submitted_at ? `${t("applications.submitted")}: ${formatDate(locale, application.submitted_at)}` : t("applications.draft")}
              {grant?.fundingAmount != null && <> · {formatCurrency(locale, grant.fundingAmount, grant.fundingCurrency)}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status as Parameters<typeof StatusBadge>[0]["status"]} />
            {isDraft && (
              <Link href={`/applications/new?grant=${grantId}`} className="inline-flex min-h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("applicationsPage.continueDraft")}</Link>
            )}
          </div>
        </div>

        {status === "CORRECTION_REQUESTED" && (
          <Alert className="mt-6 border-warning/30 bg-warning-background text-warning" role="alert">
            <p className="flex items-start gap-2 text-sm"><CircleAlert className="mt-0.5 size-4 shrink-0" />{t("applicationsPage.correctionRequestedHint")}</p>
          </Alert>
        )}

        <Card className="mt-8">
          <CardHeader><CardTitle>{t("wizard.applicationProgress")}</CardTitle></CardHeader>
          <CardContent>
            {isDraft ? (
              <p className="text-sm text-muted-foreground">{t("applicationsPage.draftNotSubmittedHint")}</p>
            ) : (
              <ol>
                {STAGES.map((stage, index) => {
                  const done = index < stageIndex || (index === stageIndex && !isRejected);
                  const active = index === stageIndex;
                  const failed = active && isRejected;
                  return (
                    <li key={stage.status} className="relative flex gap-4 pb-8 last:pb-0">
                      {index < STAGES.length - 1 && <span className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px bg-border" />}
                      <span className={`z-10 grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-success text-white" : failed ? "bg-destructive text-white" : active ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"}`}>
                        {done ? <Check className="size-4" /> : <Circle className="size-2 fill-current" />}
                      </span>
                      <div className="pt-1">
                        <div className="flex flex-wrap items-center gap-x-3">
                          <h2 className="font-semibold">{t(stage.labelKey)}</h2>
                          {active && currentStageLabel && <Badge variant={isRejected ? "destructive" : "warning"}>{currentStageLabel}</Badge>}
                        </div>
                        {stage.status === "DECIDED" && status === "APPROVED" && <p className="mt-1 text-sm text-muted-foreground">{t("applicationsPage.approvedHint")}</p>}
                        {stage.status === "DECIDED" && isRejected && <p className="mt-1 text-sm text-muted-foreground">{t("applicationsPage.rejectedHint")}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("applicationsPage.submittedAnswers")}</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(answers).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("applicationsPage.noAnswersYet")}</p>
              ) : (
                <dl className="space-y-3">
                  {Object.entries(answers).filter(([, value]) => typeof value === "string" && (value as string).trim()).slice(0, 20).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{key}</dt>
                      <dd className="mt-0.5 break-words text-sm">{String(value).slice(0, 400)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("documents.documents")}</CardTitle></CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("applicationsPage.noDocumentsYet")}</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((document) => (
                    <li key={document.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                      <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 truncate">{document.fileName}</span>
                      <Badge variant="outline" className="ml-auto">{document.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {status === "REJECTED" && (
          <AppealSection
            applicationId={application.id}
            decidedAt={application.updated_at as string}
            appeal={appeal ? { status: appeal.status, decisionNote: appeal.decisionNote } : null}
          />
        )}
      </PageContainer>
    </ApplicantShell>
  );
}
