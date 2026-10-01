"use client";

import { LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/i18n/format";
import { generateApplicationSummaryAction, type GenerateSummaryState } from "../actions/application-summary-actions";

const initialState: GenerateSummaryState = { status: "idle" };

/** AI-generated 3–4 sentence application summary with explicit generate/regenerate control. */
export function MunicipalSummaryPanel({ applicationId, initialSummary, initialGeneratedAt }: { applicationId: string; initialSummary: string | null; initialGeneratedAt: string | null }) {
  const t = useT();
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<GenerateSummaryState, FormData>(generateApplicationSummaryAction, initialState);
  const summary = state.status === "success" && state.summary ? state.summary : initialSummary;
  const generatedAt = formatDateTime(locale, state.status === "success" ? state.generatedAt : (initialGeneratedAt ?? null));

  return (
    <div className="space-y-3">
      {state.status === "error" && (
        <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert"><p className="font-semibold">{state.message}</p></Alert>
      )}
      {summary ? (
        <blockquote className="rounded-md border-l-4 border-primary/50 bg-secondary/40 p-4 text-sm leading-6 text-secondary-foreground">
          {summary}
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground">
          {state.status === "error" ? state.message : t("ai.summaryPlaceholder")}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {state.status === "success" || generatedAt !== "—" ? t("ai.generatedAt", { date: generatedAt }) : t("ai.notGeneratedYet")}
        </span>
        <form action={formAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <Button type="submit" variant="outline" size="sm" disabled={isPending}>
            {isPending ? <><LoaderCircle className="size-4 animate-spin" />{t("ai.generating")}</> : summary ? <><RefreshCw className="size-4" />{t("ai.regenerate")}</> : <><Sparkles className="size-4" />{t("ai.generate")}</>}
          </Button>
        </form>
      </div>
      <p className="text-xs text-muted-foreground">{t("ai.summaryDisclaimer")}</p>
    </div>
  );
}
