import { CalendarDays, CircleCheck, Clock, Paperclip, TriangleAlert, Upload } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/page-states";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { MilestoneSubmitForm } from "@/modules/grantee/components/grantee-milestone-form";
import { getGranteeProjectForCurrentUser } from "@/modules/grantee";
import type { MilestoneStatus } from "@/modules/grantee/milestones";
import { translate, formatDate, formatCurrency, type TranslationKey } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "My project | eGrantet" };
export const dynamic = "force-dynamic";

const milestoneStatusKeys: Record<MilestoneStatus, TranslationKey> = {
  PENDING: "milestoneStatus.PENDING",
  SUBMITTED: "milestoneStatus.SUBMITTED",
  CORRECTION_REQUESTED: "milestoneStatus.CORRECTION_REQUESTED",
  APPROVED: "milestoneStatus.APPROVED",
};

const milestoneStatusClasses: Record<MilestoneStatus, string> = {
  PENDING: "bg-secondary text-secondary-foreground",
  SUBMITTED: "bg-warning-background text-warning",
  CORRECTION_REQUESTED: "bg-destructive-background text-destructive",
  APPROVED: "bg-success-background text-success",
};

export default async function GranteeProjectPage() {
  const locale = await getServerLocale();
  const t = (key: TranslationKey) => translate(locale, key);
  let project: Awaited<ReturnType<typeof getGranteeProjectForCurrentUser>>;
  try {
    project = await getGranteeProjectForCurrentUser();
  } catch (error) {
    // Guests land here from the public nav: send them to sign-in instead of an error page.
    if (error instanceof AppError && error.code === "AUTHENTICATION") redirect("/login?next=%2Fprojects");
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return (
        <ApplicantShell>
          <PageContainer>
            <EmptyState
              title={t("projects.noProjectTitle")}
              description={t("projects.noProjectDescription")}
            />
          </PageContainer>
        </ApplicantShell>
      );
    }
    throw error;
  }

  return (
    <ApplicantShell>
      <PageContainer>
        <PageHeader
          title={project.title}
          description={`${t("projects.awardedProject")} · ${formatDate(locale, project.projectStart)} – ${formatDate(locale, project.projectEnd)}`}
          actions={<Badge variant={project.status === "ACTIVE" ? "success" : "outline"}>{project.status}</Badge>}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("applications.awardedAmount")}</p><p className="mt-1 text-2xl font-bold">{formatCurrency(locale, project.awardedAmount, "EUR")}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("projects.progressLabel")}</p><p className="mt-1 text-2xl font-bold">{project.progress}%</p><Progress className="mt-3" value={project.progress} /></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("projects.attentionNeeded")}</p><p className="mt-1 text-2xl font-bold">{project.overdueCount}</p><p className="mt-1 text-xs text-muted-foreground">{t("projects.overdueMilestones")}</p></CardContent></Card>
        </div>

        {project.overdueCount > 0 && (
          <Alert className="mt-6 border-destructive/30 bg-destructive-background text-destructive" role="alert">
            <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4" />{t("projects.overdueWarning").replace("{count}", String(project.overdueCount))}</p>
          </Alert>
        )}

        <div className="mt-8">
          <Section title={t("milestones.milestones")} description={t("projects.milestonesDescription")}>
            {project.milestones.length === 0 ? (
              <EmptyState title={t("projects.noMilestonesTitle")} description={t("projects.noMilestonesDescription")} />
            ) : (
              <ul className="space-y-4">
                {project.milestones.map((milestone) => {
                  const editable = milestone.status === "PENDING" || milestone.status === "CORRECTION_REQUESTED";
                  return (
                    <li key={milestone.id}>
                      <Card>
                        <CardHeader>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <CardTitle className="text-base">{milestone.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              {milestone.overdue && <Badge className="bg-destructive-background text-destructive">{t("milestones.overdue")}</Badge>}
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${milestoneStatusClasses[milestone.status]}`}>{t(milestoneStatusKeys[milestone.status])}</span>
                            </div>
                          </div>
                          {milestone.description && <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>}
                          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5" />{t("milestones.dueDate").replace("{date}", formatDate(locale, milestone.dueDate))}
                            {milestone.requiresEvidence && <><Paperclip className="ml-2 size-3.5" />{t("milestones.evidenceRequired")}</>}
                          </p>
                        </CardHeader>
                        {editable && (
                          <CardContent>
                            <MilestoneSubmitForm milestoneId={milestone.id} />
                          </CardContent>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </PageContainer>
    </ApplicantShell>
  );
}
