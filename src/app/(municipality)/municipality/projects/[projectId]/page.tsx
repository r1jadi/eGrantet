import { CalendarDays, FileText, Paperclip } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/page-states";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { translate, formatDate, formatCurrency, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { MilestoneCreateForm, MilestoneReviewForm } from "@/modules/grantee/components/municipality-milestone-forms";
import { getGranteeProjectForMunicipality } from "@/modules/grantee";
import type { MilestoneStatus } from "@/modules/grantee/milestones";

export const dynamic = "force-dynamic";

const milestoneStatusConfig: Record<MilestoneStatus, { labelKey: TranslationKey; className: string }> = {
  PENDING: { labelKey: "milestoneStatus.PENDING", className: "bg-secondary text-secondary-foreground" },
  SUBMITTED: { labelKey: "milestoneStatus.SUBMITTED", className: "bg-warning-background text-warning" },
  CORRECTION_REQUESTED: { labelKey: "milestoneStatus.CORRECTION_REQUESTED", className: "bg-destructive-background text-destructive" },
  APPROVED: { labelKey: "milestoneStatus.APPROVED", className: "bg-success-background text-success" },
};

export default async function MunicipalityProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const locale = await getServerLocale();
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  let detail: Awaited<ReturnType<typeof getGranteeProjectForMunicipality>>;
  try {
    detail = await getGranteeProjectForMunicipality(projectId);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) notFound();
    throw error;
  }

  const submissionsByMilestone = new Map<string, typeof detail.submissions>();
  for (const submission of detail.submissions) {
    const list = submissionsByMilestone.get(submission.milestoneId) ?? [];
    list.push(submission);
    submissionsByMilestone.set(submission.milestoneId, list);
  }

  return (
    <>
      <PageContainer>
        <Link href="/municipality/projects" className="text-sm font-semibold text-primary hover:underline">{t("municipality.projectDetailBack")}</Link>
        <div className="mt-4">
          <PageHeader
            title={detail.project.title}
            description={t("municipality.awardProjectPrefix", { dates: `${formatDate(locale, detail.project.projectStart)} – ${formatDate(locale, detail.project.projectEnd)}` })}
            actions={<Badge variant="outline">{detail.project.status}</Badge>}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("municipality.awardedDetailLabel")}</p><p className="mt-1 text-2xl font-bold">{formatCurrency(locale, detail.project.awardedAmount, "EUR")}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("municipality.progressLabel")}</p><p className="mt-1 text-2xl font-bold">{detail.project.progress}%</p><Progress className="mt-3" value={detail.project.progress} /></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("municipality.milestonesCountLabel")}</p><p className="mt-1 text-2xl font-bold">{detail.milestones.length}</p><p className="mt-1 text-xs text-muted-foreground">{t("municipality.approvedCount", { count: detail.milestones.filter((m) => m.status === "APPROVED").length })}</p></CardContent></Card>
        </div>

        <div className="mt-8 space-y-6">
          <Section title={t("municipality.timelineTitle")} description={t("municipality.timelineDescription")}>
            {detail.milestones.length === 0 ? (
              <EmptyState title={t("municipality.noMilestonesYet")} description={t("municipality.noMilestonesDescription")} />
            ) : (
              <ol className="space-y-4">
                {detail.milestones.map((milestone) => {
                  const config = milestoneStatusConfig[milestone.status];
                  const milestoneSubmissions = submissionsByMilestone.get(milestone.id) ?? [];
                  return (
                    <li key={milestone.id}>
                      <Card>
                        <CardHeader>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <CardTitle className="text-base">{milestone.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              {milestone.overdue && <Badge className="bg-destructive-background text-destructive">{t("milestones.overdue")}</Badge>}
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>{t(config.labelKey)}</span>
                            </div>
                          </div>
                          {milestone.description && <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>}
                          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{t("milestones.dueDate", { date: formatDate(locale, milestone.dueDate) })}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {milestoneSubmissions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("municipality.noSubmissionsYet")}</p>
                          ) : (
                            milestoneSubmissions.map((submission) => (
                              <div key={submission.id} className="rounded-lg border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{formatDate(locale, submission.createdAt)} · {submission.kind.toLowerCase()}</p>
                                  <Badge variant={submission.status === "APPROVED" ? "success" : submission.status === "CORRECTION_REQUESTED" ? "destructive" : "warning"}>
                                    {t(milestoneStatusConfig[submission.status as MilestoneStatus].labelKey)}
                                  </Badge>
                                </div>
                                {submission.message && <p className="mt-1 text-sm">{submission.message}</p>}
                                {submission.evidence && (
                                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Paperclip className="size-3.5" />
                                    <a href={`/api/evidence/${submission.evidence.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                                      <FileText className="size-3.5" />{submission.evidence.fileName}
                                    </a>
                                    <span>({submission.evidence.documentType})</span>
                                  </p>
                                )}
                                {submission.reviewComment && (
                                  <p className="mt-2 rounded bg-muted p-2 text-xs">{t("municipality.reviewPrefix", { comment: submission.reviewComment })}</p>
                                )}
                                {submission.status === "SUBMITTED" && (
                                  <div className="mt-3">
                                    <MilestoneReviewForm submissionId={submission.id} />
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          <Section title={t("municipality.addMilestoneTitle")}>
            <Card><CardContent className="p-5"><MilestoneCreateForm projectId={detail.project.id} nextOrder={detail.milestones.length} /></CardContent></Card>
          </Section>
        </div>
      </PageContainer>
    </>
  );
}
