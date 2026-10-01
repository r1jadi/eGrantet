"use client";

import { useActionState } from "react";
import { Gavel } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import { reviewAppealAction, type AppealActionState } from "../actions/appeal-actions";
import { AppealStatusTimeline, type AppealStatus } from "./appeal-status-timeline";

const initialState: AppealActionState = { status: "idle" };

/** Municipal review surface for the applicant's appeal of a rejected decision. */
export function MunicipalAppealReview({
  appealId,
  applicationId,
  status,
  reason,
  explanation,
  decisionNote,
}: {
  appealId: string;
  applicationId: string;
  status: AppealStatus;
  reason: string;
  explanation: string;
  decisionNote: string | null;
}) {
  const [state, formAction, isPending] = useActionState<AppealActionState, FormData>(reviewAppealAction, initialState);
  const t = useT();
  const decided = status === "DECISION_MADE";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gavel className="size-4" aria-hidden="true" />{t("appeal.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold">{t("appeal.reasonHeading")}</p>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">{t("appeal.explanationHeading")}</p>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{explanation}</p>
        </div>
        <AppealStatusTimeline currentStatus={status} />
        {decided && decisionNote && (
          <div>
            <p className="text-sm font-semibold">{t("appeal.decisionNoteHeading")}</p>
            <p className="text-sm text-muted-foreground">{decisionNote}</p>
          </div>
        )}
        {state.status !== "idle" && state.message && (
          <Alert
            className={state.status === "error" ? "border-destructive/30 bg-destructive-background text-destructive" : "border-success/30 bg-success-background text-success"}
            role={state.status === "error" ? "alert" : undefined}
          >
            <p className="font-semibold">{state.message}</p>
          </Alert>
        )}
        {!decided && (
          <form action={formAction} className="space-y-3 border-t pt-4">
            <input type="hidden" name="appealId" value={appealId} />
            <input type="hidden" name="applicationId" value={applicationId} />
            <div>
              <Label htmlFor={`appeal-note-${appealId}`}>{t("appeal.decisionNoteLabel")}</Label>
              <Textarea id={`appeal-note-${appealId}`} name="decisionNote" rows={2} maxLength={2000} className="mt-1" defaultValue={decisionNote ?? ""} placeholder={t("appeal.decisionNotePlaceholder")} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {status === "SUBMITTED" && (
                <Button type="submit" name="status" value="UNDER_REVIEW" disabled={isPending}>
                  {t("municipality.actionStartReview")}
                </Button>
              )}
              {status === "UNDER_REVIEW" && (
                <Button type="submit" name="status" value="DECISION_MADE" disabled={isPending}>
                  {t("appeal.recordDecisionButton")}
                </Button>
              )}
              <Badge variant="outline">{status}</Badge>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
