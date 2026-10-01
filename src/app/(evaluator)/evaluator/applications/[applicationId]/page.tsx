import { EyeOff } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { Alert } from "@/components/ui/alert";
import { PageContainer } from "@/components/shared/layout";
import { EvaluatorScoringWorkspace } from "@/modules/evaluations/components/evaluator-workspace";
import { getBlindApplicationForEvaluator, getEvaluatorEvaluation } from "@/modules/applications/services/evaluator-application-service";
import { listActiveScoringCriteria } from "@/modules/evaluations/services/evaluation-service";

export const dynamic = "force-dynamic";

/** Answer keys shown to the evaluator with human labels (identifying keys are already redacted). */
const answerLabels: Record<string, string> = {
  projectTitle: "Project title",
  projectSummary: "Project summary",
  projectDescription: "Project description",
  objectives: "Objectives",
  projectGoals: "Project goals",
  activities: "Planned activities",
  projectActivities: "Planned activities",
  beneficiaries: "Target beneficiaries",
  targetGroup: "Target group",
  communityImpact: "Community impact",
  expectedReach: "People expected to reach",
  budgetAmount: "Budget requested",
  projectStart: "Planned project start",
  projectLocation: "Project location",
  timeline: "Project timeline",
};

export default async function EvaluatorApplicationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  let blindApplication: Awaited<ReturnType<typeof getBlindApplicationForEvaluator>>;
  let evaluation: Awaited<ReturnType<typeof getEvaluatorEvaluation>>;
  let criteria: Awaited<ReturnType<typeof listActiveScoringCriteria>>;
  try {
    blindApplication = await getBlindApplicationForEvaluator(applicationId);
    [evaluation, criteria] = await Promise.all([
      getEvaluatorEvaluation(applicationId),
      listActiveScoringCriteria(blindApplication.grant.id),
    ]);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) notFound();
    throw error;
  }

  const answers = Object.entries(blindApplication.answers)
    .filter(([, value]) => typeof value === "string" && String(value).trim())
    .map(([key, value]) => [answerLabels[key] ?? key, String(value)] as [string, string]);

  return (
    <PageContainer>
      <Link href="/evaluator" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        ← Back to assignments
      </Link>
      <div className="mt-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Application evaluation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reference {blindApplication.applicationId.slice(0, 8).toUpperCase()} · Status {blindApplication.status}
          </p>
        </div>
        {blindApplication.blind && (
          <Alert className="border-primary/30 bg-secondary/40 text-secondary-foreground">
            <p className="flex items-center gap-2 text-sm"><EyeOff className="size-4 shrink-0" />Blind evaluation is active for this assignment: applicant identity details are hidden.</p>
          </Alert>
        )}
        <EvaluatorScoringWorkspace
          applicationId={blindApplication.applicationId}
          grantTitle={blindApplication.grant.title}
          grantDescription={blindApplication.grant.description}
          submittedAt={blindApplication.submittedAt}
          blind={blindApplication.blind}
          answers={answers}
          documents={blindApplication.documents.map((document) => ({ id: document.id, displayName: document.displayName, fileSizeBytes: document.fileSizeBytes }))}
          criteria={criteria.map((criterion) => ({
            id: criterion.id,
            name: criterion.name,
            description: "",
            maximumScore: criterion.maximumScore,
            displayOrder: criterion.displayOrder,
            scoringMode: criterion.scoringMode,
          }))}
          evaluation={evaluation
            ? { status: evaluation.status, criterionScores: evaluation.criterionScores, comment: evaluation.comment, updatedAt: evaluation.updatedAt }
            : null}
        />
      </div>
    </PageContainer>
  );
}
