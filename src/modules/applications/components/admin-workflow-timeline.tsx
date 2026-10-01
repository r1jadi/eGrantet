"use client";

import { CircleAlert, CircleCheck, CircleDashed, Clock } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
import type { ApplicationStatus } from "../types";

type StageTone = "done" | "current" | "pending" | "attention";

const stageToneStyles: Record<StageTone, { icon: typeof CircleCheck; ring: string; iconClass: string }> = {
  done: { icon: CircleCheck, ring: "border-success/40 bg-success-background", iconClass: "text-success" },
  current: { icon: Clock, ring: "border-primary/50 bg-secondary", iconClass: "text-primary" },
  pending: { icon: CircleDashed, ring: "border-border bg-card", iconClass: "text-muted-foreground" },
  attention: { icon: CircleAlert, ring: "border-destructive/40 bg-destructive-background", iconClass: "text-destructive" },
};

interface TimelineProps {
  status: ApplicationStatus;
  checks: Array<{ result: "PENDING" | "PASSED" | "FAILED" | string }>;
  verification: { status: string; completedAt: string | null } | null;
  evaluations: { total: number; submitted: number };
}

interface Stage {
  key: TranslationKey;
  tone: StageTone;
  detail?: string;
}

/**
 * Derives the real workflow stages from persisted application data: the
 * lifecycle status drives submitted/review/decision, eligibility checks and
 * the verification overview drive their stages, and evaluation rows drive
 * evaluation. Failed or correction-needing states surface as "attention".
 */
export function AdminWorkflowTimeline({ status, checks, verification, evaluations }: TimelineProps) {
  const t = useT();

  const isDecided = status === "APPROVED" || status === "REJECTED";
  const eligibilityFailed = checks.some((check) => check.result === "FAILED");
  const eligibilityPassed = checks.length > 0 && checks.every((check) => check.result === "PASSED");
  const verificationStatus = verification?.status ?? "NOT_RUN";
  const verificationFailed = verificationStatus === "FAILED" || status === "REJECTED";
  const verificationNeedsReview = verificationStatus === "NEEDS_REVIEW" || status === "CORRECTION_REQUESTED";
  const isDraft = status === "DRAFT" || status === "WITHDRAWN";

  const stages: Stage[] = [
    {
      key: "workflow.stageSubmitted",
      tone: isDraft ? "attention" : "done",
      detail: isDraft ? t(`statusLabels.application.${status}` as TranslationKey) : undefined,
    },
    {
      key: "workflow.stageEligibility",
      tone: checks.length === 0 ? (isDraft ? "pending" : "current") : eligibilityFailed ? "attention" : "done",
      detail: checks.length === 0 ? undefined : eligibilityFailed ? t("workflow.eligibilityFailedDetail") : eligibilityPassed ? undefined : t("workflow.eligibilityPartialDetail"),
    },
    {
      key: "workflow.stageVerification",
      tone: verificationStatus === "NOT_RUN" ? (isDraft ? "pending" : "current") : verificationFailed ? "attention" : verificationStatus === "COMPLETED" ? "done" : verificationNeedsReview ? "attention" : "current",
      detail: verificationFailed ? t("workflow.verificationFailedDetail") : verificationNeedsReview ? t("workflow.verificationReviewDetail") : undefined,
    },
    {
      key: "workflow.stageReview",
      tone: ["SUBMITTED", "UNDER_REVIEW"].includes(status) ? "current" : isDecided || status === "CORRECTION_REQUESTED" ? "done" : "pending",
      detail: status === "CORRECTION_REQUESTED" ? t("workflow.correctionDetail") : undefined,
    },
    {
      key: "workflow.stageEvaluation",
      tone: evaluations.submitted > 0 ? "done" : evaluations.total > 0 ? "current" : isDecided ? "done" : "pending",
      detail: evaluations.total > 0 ? t("workflow.evaluationDetail", { submitted: evaluations.submitted, total: evaluations.total }) : undefined,
    },
    {
      key: "workflow.stageDecision",
      tone: status === "APPROVED" ? "done" : status === "REJECTED" ? "attention" : isDecided ? "done" : "pending",
      detail: isDecided ? t(`statusLabels.application.${status}` as TranslationKey) : undefined,
    },
    { key: "workflow.stagePostAward", tone: status === "APPROVED" ? "done" : "pending" },
  ];

  return (
    <section aria-label={t("workflow.title")} className="rounded-xl border bg-card shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight">{t("workflow.title")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("workflow.description")}</p>
      </div>
      <ol className="flex flex-col gap-0 px-5 py-4 sm:flex-row sm:gap-2">
        {stages.map((stage, index) => {
          const style = stageToneStyles[stage.tone];
          const Icon = style.icon;
          return (
            <li key={stage.key} className="flex flex-1 flex-col min-w-0 sm:pt-1" aria-current={stage.tone === "current" ? "step" : undefined}>
              <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full border ${style.ring}`}>
                  <Icon className={`size-4 ${style.iconClass}`} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${stage.tone === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{index + 1}. {t(stage.key)}</p>
                  {stage.detail && <p className={`mt-0.5 text-xs leading-snug ${stage.tone === "attention" ? "text-destructive" : "text-muted-foreground"}`}>{stage.detail}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
