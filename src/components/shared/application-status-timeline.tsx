"use client";

import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
import type { ApplicationStatusName } from "./status-badge";

const steps: Array<{ status: ApplicationStatusName; key: TranslationKey }> = [
  { status: "DRAFT", key: "statusLabels.application.DRAFT" },
  { status: "SUBMITTED", key: "statusLabels.application.SUBMITTED" },
  { status: "UNDER_REVIEW", key: "statusLabels.application.UNDER_REVIEW" },
  { status: "APPROVED", key: "applications.decision" },
];

/** Map non-step statuses onto the closest timeline position. */
function normalize(status: ApplicationStatusName): ApplicationStatusName {
  if (status === "CORRECTION_REQUESTED" || status === "REJECTED") return "UNDER_REVIEW";
  return status === "WITHDRAWN" ? "DRAFT" : status;
}

export function ApplicationStatusTimeline({ currentStatus }: { currentStatus: ApplicationStatusName }) {
  const normalized = normalize(currentStatus);
  const currentIndex = Math.max(0, steps.findIndex((step) => step.status === normalized));
  const t = useT();
  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.status} className="flex items-center gap-2 sm:block">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
              index <= currentIndex ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
            )}
          >
            {index + 1}
          </span>
          <span className="mt-0.5 text-sm font-medium sm:block">{t(step.key)}</span>
        </li>
      ))}
    </ol>
  );
}
