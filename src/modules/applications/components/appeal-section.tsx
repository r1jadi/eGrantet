"use client";

import { CalendarClock, CircleAlert, CircleCheck, Gavel, LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDateLong } from "@/lib/i18n/format";
import { submitAppealAction, type AppealActionState } from "../actions/appeal-actions";
import { AppealStatusTimeline, type AppealStatus } from "./appeal-status-timeline";

/** Applicants have 8 days from the results date to submit an appeal. */
const APPEAL_WINDOW_DAYS = 8;

/** Computes the appeal deadline and whether it has passed, without impure calls during render. */
function useAppealWindow(decidedAt: string) {
  const [windowState] = useState(() => {
    const deadline = new Date(decidedAt);
    deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
    return { deadline, isPassed: deadline.getTime() <= Date.now() };
  });
  return windowState;
}

const initialAppealState: AppealActionState = { status: "idle" };

export function AppealSection({
  applicationId,
  decidedAt,
  appeal,
}: {
  applicationId: string;
  decidedAt: string;
  appeal: { status: AppealStatus; decisionNote: string | null } | null;
}) {
  const t = useT();
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<AppealActionState, FormData>(submitAppealAction, initialAppealState);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ reason?: string; explanation?: string }>({});
  const [reason, setReason] = useState("");
  const [explanation, setExplanation] = useState("");

  const { deadline, isPassed: isDeadlinePassed } = useAppealWindow(decidedAt);
  const formattedDeadline = formatDateLong(locale, deadline);

  // Server-rendered state is the source of truth: a persisted appeal (from
  // props) or a successful submit renders the status view.
  const hasAppeal = appeal != null || state.status === "success" || submitted;

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!reason.trim()) nextErrors.reason = t("appeal.validationReason");
    if (!explanation.trim()) nextErrors.explanation = t("appeal.validationExplanation");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  if (hasAppeal) {
    return (
      <section aria-labelledby="appeal-heading" className="mt-8">
        <h2 id="appeal-heading" className="text-xl font-bold">{t("appeal.title")}</h2>
        <div className="mt-4 space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-background p-5">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="font-semibold text-success">{t("appeal.submittedNotice")}</p>
              <p className="mt-1 text-sm text-success/90">{t("appeal.submittedNoticeDetail")}</p>
            </div>
          </div>
          {appeal?.decisionNote && (
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-semibold">{t("appeal.decisionTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{appeal.decisionNote}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">{t("appeal.statusTitle")}</p>
            <AppealStatusTimeline currentStatus={appeal?.status ?? "SUBMITTED"} className="mt-3" />
          </div>
        </div>
      </section>
    );
  }

  if (isDeadlinePassed) {
    return (
      <section aria-labelledby="appeal-heading" className="mt-8">
        <h2 id="appeal-heading" className="text-xl font-bold">{t("appeal.title")}</h2>
        <div className="mt-4 flex items-start gap-3 rounded-xl border bg-card p-5">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t("appeal.windowClosedTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("appeal.windowClosedDescription", { date: formattedDeadline })}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="appeal-heading" className="mt-8">
      <h2 id="appeal-heading" className="text-xl font-bold">{t("appeal.title")}</h2>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!validate()) event.preventDefault();
        }}
        noValidate
        className="mt-4 space-y-5 rounded-xl border bg-card p-5 sm:p-6"
      >
        <input type="hidden" name="applicationId" value={applicationId} />
        {state.status === "error" && state.message && (
          <p className="rounded-md border border-destructive/30 bg-destructive-background px-3 py-2 text-sm text-destructive" role="alert">{state.message}</p>
        )}
        <div className="flex items-start gap-3 rounded-lg bg-warning-background p-4 text-sm text-warning">
          <CalendarClock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{t("appeal.windowNotice", { date: formattedDeadline })}</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="appeal-reason" className="font-semibold">{t("appeal.reasonLabel")} <span className="text-destructive" aria-hidden="true">*</span></Label>
            <Badge variant="outline">{t("appeal.requiredBadge")}</Badge>
          </div>
          <input
            id="appeal-reason"
            name="reason"
            value={reason}
            onChange={(event) => { setReason(event.target.value); if (errors.reason) setErrors((current) => ({ ...current, reason: undefined })); }}
            type="text"
            maxLength={200}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.reason)}
            placeholder={t("appeal.reasonPlaceholder")}
            className="flex min-h-10 w-full rounded-md border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
          {errors.reason && <p className="text-sm font-medium text-destructive" role="alert">{errors.reason}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="appeal-explanation" className="font-semibold">{t("appeal.explanationLabel")} <span className="text-destructive" aria-hidden="true">*</span></Label>
            <Badge variant="outline">{t("appeal.requiredBadge")}</Badge>
          </div>
          <Textarea
            id="appeal-explanation"
            name="explanation"
            value={explanation}
            onChange={(event) => { setExplanation(event.target.value); if (errors.explanation) setErrors((current) => ({ ...current, explanation: undefined })); }}
            rows={6}
            maxLength={4000}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.explanation)}
            placeholder={t("appeal.explanationPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("appeal.charactersUsed", { count: String(explanation.length) })}</p>
          {errors.explanation && <p className="text-sm font-medium text-destructive" role="alert">{errors.explanation}</p>}
        </div>
        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <p className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><Gavel className="size-4 shrink-0" aria-hidden="true" />{t("appeal.reviewedByOfficer")}</p>
          <Button type="submit" disabled={isPending}>
            {isPending ? <><LoaderCircle className="size-4 animate-spin" />{t("appeal.submitting")}</> : <>{t("appeal.submitButton")} <Send className="size-4" aria-hidden="true" /></>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("appeal.statusUpdatesNote1")} <Link href="/notifications" className="font-semibold text-primary hover:underline">{t("appeal.statusUpdatesNoteLink")}</Link>{t("appeal.statusUpdatesNote2")}
        </p>
      </form>
    </section>
  );
}
