"use client";

import { LoaderCircle, Send, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/client";
import { generateDecisionLetterAction, sendDecisionLetterAction, type GenerateLetterState, type SendLetterState } from "../actions/decision-letter-actions";

type Decision = "ACCEPTANCE" | "REJECTION";

const initialGenerateState: GenerateLetterState = { status: "idle" };
const initialSendState: SendLetterState = { status: "idle" };

/**
 * AI-assisted decision lettering. The administrator chooses the decision,
 * optionally documents a review finding, then reviews/edits the AI wording
 * and confirms before anything is sent. The AI never decides the outcome.
 */
export function MunicipalLetterPanel({ applicationId, disabled, disabledReason }: { applicationId: string; disabled: boolean; disabledReason?: string }) {
  const t = useT();
  const [generateState, generateAction, generatePending] = useActionState<GenerateLetterState, FormData>(generateDecisionLetterAction, initialGenerateState);
  const [sendState, sendAction, sendPending] = useActionState<SendLetterState, FormData>(sendDecisionLetterAction, initialSendState);
  const [decision, setDecision] = useState<Decision>("ACCEPTANCE");
  const [reviewerNote, setReviewerNote] = useState("");
  // The generated draft is adopted during render (React docs pattern for
  // adjusting state when props/action state change), avoiding setState in effects.
  const [adoptedDraft, setAdoptedDraft] = useState<{ subject: string; body: string } | null>(null);
  const [lastGeneration, setLastGeneration] = useState<GenerateLetterState | null>(null);
  if (generateState !== lastGeneration) {
    setLastGeneration(generateState);
    if (generateState.status === "success" && generateState.subject && generateState.body) {
      setAdoptedDraft({ subject: generateState.subject, body: generateState.body });
    }
  }
  const subject = adoptedDraft?.subject ?? "";
  const body = adoptedDraft?.body ?? "";
  const hasDraft = adoptedDraft !== null;
  const setSubject = (value: string) => setAdoptedDraft({ subject: value, body });
  const setBody = (value: string) => setAdoptedDraft({ subject, body: value });

  if (disabled) {
    return <p className="text-sm text-muted-foreground">{disabledReason ?? t("ai.letterDisabledDefault")}</p>;
  }

  return (
    <section className="space-y-4">
      {sendState.status === "success" && (
        <Alert className="border-success/30 bg-success-background text-success"><p className="font-semibold">{sendState.message}</p></Alert>
      )}
      {sendState.status === "error" && (
        <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert"><p className="font-semibold">{sendState.message}</p></Alert>
      )}

      <form action={generateAction} className="space-y-4 rounded-lg border bg-card p-5">
        <input type="hidden" name="applicationId" value={applicationId} />
        <div className="space-y-2">
          <Label>{t("ai.letterDecisionLabel")}</Label>
          <div className="flex gap-2">
            {(["ACCEPTANCE", "REJECTION"] as Decision[]).map((option) => (
              <button key={option} type="button" onClick={() => setDecision(option)} aria-pressed={decision === option}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${decision === option ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
                {option === "ACCEPTANCE" ? t("ai.letterAcceptance") : t("ai.letterRejection")}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="letter-reviewer-note">{t("ai.letterFindingLabel")}</Label>
          <textarea id="letter-reviewer-note" name="reviewerNote" rows={3} maxLength={2000} value={reviewerNote} onChange={(event) => setReviewerNote(event.target.value)}
            placeholder={t("ai.letterFindingPlaceholder")}
            className="w-full rounded-md border bg-card px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">{t("ai.letterFindingHint")}</p>
        </div>
        {generateState.status === "error" && (
          <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert"><p className="font-semibold">{generateState.message}</p></Alert>
        )}
        <input type="hidden" name="decision" value={decision} />
        <Button type="submit" variant="outline" disabled={generatePending}>
          {generatePending ? <><LoaderCircle className="size-4 animate-spin" />{t("ai.generatingLetter")}</> : <><Sparkles className="size-4" />{hasDraft ? t("ai.regenerateLetter") : t("ai.generateLetter")}</>}
        </Button>
      </form>

      {hasDraft && (
        <form action={sendAction} className="space-y-4 rounded-lg border bg-card p-5">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="decision" value={decision} />
          <input type="hidden" name="wasEdited" value={generateState.status === "success" ? "false" : "true"} />
          <div className="space-y-2">
            <Label htmlFor="letter-subject">{t("ai.letterSubjectLabel")}</Label>
            <Input id="letter-subject" name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="letter-body">{t("ai.letterBodyLabel")}</Label>
            <textarea id="letter-body" name="body" rows={14} maxLength={10_000} value={body} onChange={(event) => setBody(event.target.value)}
              className="w-full rounded-md border bg-card px-3 py-2 text-sm" />
            <p className="text-xs text-muted-foreground">{t("ai.letterBodyHint")}</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirmed" className="mt-0.5 size-4 rounded border accent-primary" />
            <span>{t("ai.letterConfirmSend")}</span>
          </label>
          <Button type="submit" disabled={sendPending}>
            {sendPending ? <><LoaderCircle className="size-4 animate-spin" />{t("ai.sendingLetter")}</> : <><Send className="size-4" />{t("ai.sendLetter")}</>}
          </Button>
        </form>
      )}
    </section>
  );
}
