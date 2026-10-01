"use client";

import { LoaderCircle, UserPlus, X } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDateTime, formatNumber } from "@/lib/i18n/format";
import { assignEvaluatorAction, revokeEvaluatorAction, type AssignState } from "../actions/evaluation-actions";

const initialAssignState: AssignState = { status: "idle" };
const initialRevokeState: AssignState = { status: "idle" };

/** Municipality evaluation manager for one application: assignments + progress + score totals. */
export function MunicipalityEvaluations({ applicationId, assignments, evaluations }: {
  applicationId: string;
  assignments: Array<{ evaluatorId: string; evaluatorName: string | null; assignedAt: string }>;
  evaluations: Array<{ evaluatorId: string; evaluatorName: string | null; status: "DRAFT" | "SUBMITTED"; score: number | null; updatedAt: string | null }>;
}) {
  const t = useT();
  const locale = useLocale();
  const [assignState, assignFormAction, assignPending] = useActionState<AssignState, FormData>(assignEvaluatorAction, initialAssignState);
  const [revokeState, revokeFormAction, revokePending] = useActionState<AssignState, FormData>(revokeEvaluatorAction, initialRevokeState);

  return (
    <Card>
      <CardHeader><CardTitle>{t("municipality.evaluationPanelTitle")}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {(assignState.status === "error" || assignState.status === "success") && (
          <Alert className={assignState.status === "error" ? "border-destructive/30 bg-destructive-background text-destructive" : "border-success/30 bg-success-background text-success"} role={assignState.status === "error" ? "alert" : undefined}>
            <p className="font-semibold">{assignState.message}</p>
          </Alert>
        )}
        {(revokeState.status === "error" || revokeState.status === "success") && (
          <Alert className={revokeState.status === "error" ? "border-destructive/30 bg-destructive-background text-destructive" : "border-success/30 bg-success-background text-success"} role={revokeState.status === "error" ? "alert" : undefined}>
            <p className="font-semibold">{revokeState.message}</p>
          </Alert>
        )}

        <div>
          <p className="text-sm font-semibold">{t("municipality.assignedEvaluators")}</p>
          {assignments.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("municipality.noEvaluatorsAssigned")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {assignments.map((assignment) => (
                <li key={assignment.evaluatorId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{assignment.evaluatorName}</p>
                    <p className="text-xs text-muted-foreground">{t("municipality.assignedAt", { date: formatDateTime(locale, assignment.assignedAt) })}</p>
                  </div>
                  <form action={revokeFormAction}>
                    <input type="hidden" name="applicationId" value={applicationId} />
                    <input type="hidden" name="evaluatorId" value={assignment.evaluatorId} />
                    <Button type="submit" variant="ghost" size="sm" aria-label={t("municipality.removeEvaluatorFor", { name: assignment.evaluatorName ?? "" })}>
                      <X className="size-4" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold">{t("municipality.evaluationProgress")}</p>
          {evaluations.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("municipality.noEvaluationsStarted")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {evaluations.map((evaluation) => (
                <li key={evaluation.evaluatorId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{evaluation.evaluatorName}</p>
                    <p className="text-xs text-muted-foreground">{t("municipality.lastUpdate", { date: formatDateTime(locale, evaluation.updatedAt) })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {evaluation.score !== null && <Badge className="bg-secondary text-secondary-foreground">{formatNumber(locale, evaluation.score)} {t("evaluator.pointsUnit")}</Badge>}
                    <Badge variant={evaluation.status === "SUBMITTED" ? "success" : "warning"}>{evaluation.status === "SUBMITTED" ? t("evaluator.statusSubmitted") : t("evaluator.statusDraft")}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form action={assignFormAction} className="space-y-3 rounded-lg border p-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <Label htmlFor="evaluatorEmail" className="text-sm font-semibold">{t("municipality.assignEvaluatorTitle")}</Label>
          <Input id="evaluatorEmail" name="evaluatorEmail" type="email" required placeholder={t("municipality.evaluatorEmailPlaceholder")} />
          <Button type="submit" size="sm" disabled={assignPending}>
            {assignPending ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}{t("municipality.assignEvaluatorButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
