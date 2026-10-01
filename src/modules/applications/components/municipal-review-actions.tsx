"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
import { changeMunicipalApplicationStatusAction, type MunicipalActionState } from "../actions/municipal-application-actions";
import { listAvailableApplicationTransitions } from "../lifecycle";
import type { ApplicationStatus } from "../types";

/** Transitions owned by the applicant; the municipality never performs these. */
const APPLICANT_OWNED_TRANSITIONS: ApplicationStatus[] = ["SUBMITTED", "WITHDRAWN"];

const actionConfig: Partial<Record<ApplicationStatus, { labelKey: TranslationKey; variant: "default" | "outline" | "destructive" }>> = {
  UNDER_REVIEW: { labelKey: "municipality.actionStartReview", variant: "default" },
  CORRECTION_REQUESTED: { labelKey: "municipality.actionRequestCorrection", variant: "outline" },
  APPROVED: { labelKey: "municipality.actionApprove", variant: "default" },
  REJECTED: { labelKey: "municipality.actionReject", variant: "destructive" },
};

const waitingNotes: Partial<Record<ApplicationStatus, TranslationKey>> = {
  CORRECTION_REQUESTED: "municipality.waitingCorrection",
  APPROVED: "municipality.waitingApproved",
  REJECTED: "municipality.waitingRejected",
};

/** Derives municipal-side actions from the shared lifecycle, excluding applicant-owned transitions. */
export function municipalNextActions(status: ApplicationStatus): ApplicationStatus[] {
  return listAvailableApplicationTransitions(status).filter((next) => !APPLICANT_OWNED_TRANSITIONS.includes(next));
}

export function MunicipalReviewActions({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<MunicipalActionState, FormData>(changeMunicipalApplicationStatusAction, { status: "idle" });
  const actions = municipalNextActions(status);
  const waitingNoteKey = waitingNotes[status];

  return (
    <section className="space-y-4">
      {state.status === "error" && (
        <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert">
          <p className="flex items-start gap-2 font-semibold"><CircleAlert className="mt-0.5 size-4 shrink-0" />{state.message}</p>
        </Alert>
      )}
      {state.status === "success" && (
        <Alert className="border-success/30 bg-success-background text-success">
          <p className="font-semibold">{state.message}</p>
        </Alert>
      )}
      <form action={formAction} className="space-y-4 rounded-lg border bg-card p-5">
        <input type="hidden" name="applicationId" value={applicationId} />
        <div className="space-y-2">
          <Label htmlFor="review-message">{t("municipality.messageToApplicant")}</Label>
          <textarea id="review-message" name="message" rows={3} maxLength={1000} placeholder={t("municipality.messagePlaceholder")} className="w-full rounded-md border bg-card px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {t("municipality.currentStatus")}: <StatusBadge status={status} />
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((next) => (
                <Button key={next} type="submit" name="nextStatus" value={next} variant={actionConfig[next]?.variant ?? "default"} disabled={isPending}>
                  {isPending ? <><LoaderCircle className="size-4 animate-spin" />{t("common.loading")}</> : actionConfig[next] ? t(actionConfig[next].labelKey) : t("municipality.moveTo", { status: next })}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{waitingNoteKey ? t(waitingNoteKey) : t("municipality.noFurtherActions")}</p>
          )}
        </div>
      </form>
    </section>
  );
}
