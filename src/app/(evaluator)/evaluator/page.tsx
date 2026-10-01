import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { AppError } from "@/lib/errors/app-error";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/page-states";
import { PageContainer, PageHeader, Section } from "@/components/shared/layout";
import { EvaluatorAssignmentList } from "@/modules/evaluations/components/evaluator-workspace";
import { listAssignedApplications } from "@/modules/evaluations";
import { translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Evaluator workspace | Team Avengers" };
export const dynamic = "force-dynamic";

async function Assignments() {
  const locale = await getServerLocale();
  let assignments: Awaited<ReturnType<typeof listAssignedApplications>>;
  try {
    assignments = await listAssignedApplications();
  } catch (error) {
    if (error instanceof AppError && error.code === "AUTHORIZATION") {
      return <EmptyState title={translate(locale, "evaluator.noAssignments")} description={translate(locale, "evaluator.noAssignmentsDescription")} />;
    }
    throw error;
  }
  return (
    <EvaluatorAssignmentList
      items={assignments.map((assignment) => ({
        applicationId: assignment.applicationId,
        grantTitle: assignment.application.grantTitle,
        status: assignment.application.status,
        evaluationStatus: assignment.evaluation.status,
        totalScore: assignment.evaluation.score,
        blind: assignment.blind,
        submittedAt: assignment.application.submittedAt,
      }))}
    />
  );
}

export default async function EvaluatorDashboardPage() {
  const locale = await getServerLocale();
  return (
    <PageContainer>
      <PageHeader
        title={translate(locale, "evaluator.workspaceTitle")}
        description={translate(locale, "evaluator.workspaceDescription")}
        actions={<ClipboardList className="size-8 text-primary" aria-hidden="true" />}
      />
      <div className="mt-6">
        <Section title={translate(locale, "evaluator.assignedApplicationsTitle")}>
          <Suspense fallback={<LoadingState rows={3} />}>
            <Assignments />
          </Suspense>
        </Section>
      </div>
    </PageContainer>
  );
}
