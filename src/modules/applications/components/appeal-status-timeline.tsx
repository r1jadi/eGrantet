import { cn } from "@/lib/utils/cn";
import { useT, type TranslationKey } from "@/lib/i18n/client";

export const APPEAL_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "DECISION_MADE"] as const;

export type AppealStatus = (typeof APPEAL_STATUSES)[number];

const STEPS: Array<{ status: AppealStatus; labelKey: TranslationKey; descriptionKey: TranslationKey }> = [
  { status: "SUBMITTED", labelKey: "appeal.statusSubmitted", descriptionKey: "appeal.statusSubmittedDesc" },
  { status: "UNDER_REVIEW", labelKey: "appeal.statusUnderReview", descriptionKey: "appeal.statusUnderReviewDesc" },
  { status: "DECISION_MADE", labelKey: "appeal.statusDecisionMade", descriptionKey: "appeal.statusDecisionMadeDesc" },
];

export function AppealStatusTimeline({ currentStatus, className }: { currentStatus: AppealStatus; className?: string }) {
  const t = useT();
  const currentIndex = Math.max(0, STEPS.findIndex((step) => step.status === currentStatus));
  return (
    <ol className={cn("grid gap-4 sm:grid-cols-3", className)}>
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step.status} aria-current={isCurrent ? "step" : undefined} className={cn("rounded-lg border p-4", reached ? "border-primary/30 bg-secondary" : "bg-card")}>
            <div className="flex items-center gap-2.5">
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{index + 1}</span>
              <p className={cn("text-sm font-semibold", reached ? "text-foreground" : "text-muted-foreground")}>{t(step.labelKey)}</p>
            </div>
            <p className={cn("mt-2 text-sm", isCurrent ? "text-foreground" : "text-muted-foreground")}>{t(step.descriptionKey)}</p>
          </li>
        );
      })}
    </ol>
  );
}
