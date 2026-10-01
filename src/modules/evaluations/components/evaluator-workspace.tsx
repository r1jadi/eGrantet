"use client";

import { EyeOff, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDate } from "@/lib/i18n/format";
import type { TranslationKey } from "@/lib/i18n";
import { saveEvaluationAction, type SaveEvaluationState } from "../actions/evaluation-actions";

const initialState: SaveEvaluationState = { status: "idle" };

export interface ScoringCriterionView {
  id: string;
  name: string;
  description: string;
  maximumScore: number;
  displayOrder: number;
  scoringMode: "MANUAL" | "AUTOMATIC";
}

export interface ScoringWorkspaceProps {
  applicationId: string;
  grantTitle: string;
  grantDescription: string;
  submittedAt: string | null;
  blind: boolean;
  answers: Array<[string, string]>;
  documents: Array<{ id: string; displayName: string; fileSizeBytes: number }>;
  criteria: ScoringCriterionView[];
  evaluation: {
    status: "DRAFT" | "SUBMITTED" | null;
    criterionScores: Record<string, number>;
    comment: string;
    updatedAt: string | null;
  } | null;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** The evaluator's blind scoring workspace: criteria inputs + deterministic total + audit-safe save/submit. */
export function EvaluatorScoringWorkspace(props: ScoringWorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<SaveEvaluationState, FormData>(saveEvaluationAction, initialState);
  const locked = props.evaluation?.status === "SUBMITTED";
  const automaticCriteria = props.criteria.filter((criterion) => criterion.scoringMode === "AUTOMATIC");
  // Controlled score inputs: they survive server-action revalidation (router
  // refresh re-renders uncontrolled inputs back to their defaultValue).
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const criterion of props.criteria.filter((c) => c.scoringMode === "MANUAL")) {
      initial[criterion.id] = String(props.evaluation?.criterionScores[criterion.id] ?? "");
    }
    return initial;
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="applicationId" value={props.applicationId} />
      <input type="hidden" name="expectedUpdatedAt" value={props.evaluation?.updatedAt ?? ""} />

      {props.blind && (
        <Alert className="border-primary/30 bg-secondary/40 text-secondary-foreground">
          <p className="flex items-center gap-2 text-sm"><EyeOff className="size-4 shrink-0" />{t("evaluator.blindReview")}: {t("evaluator.blindEvaluationNote")}</p>
        </Alert>
      )}

      {state.status === "error" && (
        <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert"><p className="font-semibold">{state.message}</p></Alert>
      )}
      {state.status === "success" && (
        <Alert className="border-success/30 bg-success-background text-success">
          <p className="font-semibold">{state.message}{typeof state.totalScore === "number" ? ` — ${t("evaluator.totalPoints", { count: state.totalScore })}` : ""}</p>
          {state.warnings && state.warnings.length > 0 && <p className="mt-1 text-sm">{state.warnings.join(" ")}</p>}
        </Alert>
      )}
      {locked && (
        <Alert className="border-success/30 bg-success-background text-success">
          <p className="font-semibold">{t("evaluator.submittedLocked")}</p>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{props.grantTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">{props.grantDescription}</p>
          {props.submittedAt && <p className="text-xs text-muted-foreground">{t("evaluator.submittedAt", { date: formatDate(locale, props.submittedAt) })}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {props.answers.length === 0 && <p className="text-sm text-muted-foreground">{t("evaluator.noFreeTextAnswers")}</p>}
          {props.answers.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 whitespace-pre-line text-sm">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {props.documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("documents.documents")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {props.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="truncate">{document.displayName}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(document.fileSizeBytes)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">{t("evaluator.scores")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {props.criteria.length === 0 && <p className="text-sm text-muted-foreground">{t("evaluator.noCriteria")}</p>}
          {props.criteria.map((criterion) => (
            <div key={criterion.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{criterion.name}</p>
                  {criterion.description && <p className="mt-0.5 text-xs text-muted-foreground">{criterion.description}</p>}
                </div>
                <Badge variant="outline">{criterion.scoringMode === "AUTOMATIC" ? t("evaluator.automatic") : `0–${criterion.maximumScore} ${t("evaluator.pointsUnit")}`}</Badge>
              </div>
              {criterion.scoringMode === "AUTOMATIC" ? (
                <p className="mt-2 text-xs text-muted-foreground">{t("evaluator.automaticHint")}</p>
              ) : (
                <div className="mt-3">
                  <Label htmlFor={`score-${criterion.id}`} className="sr-only">{t("evaluator.scoreFor", { name: criterion.name })}</Label>
                  <Input
                    id={`score-${criterion.id}`}
                    name={`score-${criterion.id}`}
                    type="number"
                    min={0}
                    max={criterion.maximumScore}
                    step="0.5"
                    disabled={locked || isPending}
                    value={scores[criterion.id] ?? ""}
                    onChange={(event) => setScores((current) => ({ ...current, [criterion.id]: event.target.value }))}
                  />
                </div>
              )}
            </div>
          ))}
          {automaticCriteria.length > 0 && <p className="text-xs text-muted-foreground">{t("evaluator.automaticReScored")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("evaluator.justification")}</CardTitle></CardHeader>
        <CardContent>
          <Label htmlFor="comment" className="sr-only">{t("evaluator.evaluationComment")}</Label>
          <Textarea id="comment" name="comment" rows={5} disabled={locked || isPending} defaultValue={props.evaluation?.comment ?? ""} placeholder={t("evaluator.justificationPlaceholder")} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("evaluator.auditNote")}</p>
        <div className="flex gap-3">
          <Button type="submit" name="submit" value="false" variant="outline" disabled={locked || isPending}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{t("evaluator.saveDraft")}
          </Button>
          <Button type="submit" name="submit" value="true" disabled={locked || isPending}>{t("evaluator.submitEvaluation")}</Button>
        </div>
      </div>
    </form>
  );
}

const evaluationStatusLabels: Record<string, TranslationKey> = {
  SUBMITTED: "evaluator.statusSubmitted",
  DRAFT: "evaluator.statusDraft",
};

export function EvaluatorAssignmentList({ items }: { items: Array<{ applicationId: string; grantTitle: string; status: string; evaluationStatus: string | null; totalScore: number | null; blind: boolean; submittedAt: string | null }> }) {
  const t = useT();
  const locale = useLocale();
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
        <h2 className="text-base font-semibold">{t("evaluator.noAssignments")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("evaluator.noAssignmentsDescription")}</p>
      </div>
    );
  }
  const submittedCount = items.filter((item) => item.evaluationStatus === "SUBMITTED").length;
  const draftCount = items.filter((item) => item.evaluationStatus === "DRAFT").length;
  const notStarted = items.length - submittedCount - draftCount;
  return (
    <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3" role="status">
      <StatBlock label={t("evaluator.statsAssigned")} value={items.length} />
      <StatBlock label={t("evaluator.statsSubmitted")} value={submittedCount} />
      <StatBlock label={t("evaluator.statsOutstanding")} value={draftCount + notStarted} />
    </div>
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.applicationId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="min-w-0">
            <Link href={`/evaluator/applications/${item.applicationId}`} className="text-sm font-semibold text-primary hover:underline">
              {item.grantTitle}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.submittedAt ? t("evaluator.submittedAt", { date: formatDate(locale, item.submittedAt) }) : t("common.notSubmitted")}
              {" · "}
              {item.blind ? t("evaluator.blindEvaluation") : t("evaluator.identityVisible")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.evaluationStatus === "SUBMITTED" ? (
              <Badge className="bg-success-background text-success">{t("evaluator.statusSubmitted")}{typeof item.totalScore === "number" ? ` · ${item.totalScore} ${t("evaluator.pointsUnit")}` : ""}</Badge>
            ) : item.evaluationStatus === "DRAFT" ? (
              <Badge variant="warning">{t("evaluator.statusDraft")}{typeof item.totalScore === "number" ? ` · ${item.totalScore} ${t("evaluator.pointsUnit")}` : ""}</Badge>
            ) : (
              <Badge variant="outline">{t("evaluator.statusNotStarted")}</Badge>
            )}
            <StatusBadge status={item.status as never} />
          </div>
        </li>
      ))}
    </ul>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-card px-5 py-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>;
}
