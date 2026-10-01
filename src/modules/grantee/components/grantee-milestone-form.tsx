"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import { submitMilestoneAction, type GranteeActionState } from "../actions/grantee-actions";

const initialState: GranteeActionState = { status: "idle" };

/** Grantee milestone submission: note + evidence/photo files (PDF/PNG/JPEG, ≤10 MB). */
export function MilestoneSubmitForm({ milestoneId }: { milestoneId: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<GranteeActionState, FormData>(submitMilestoneAction, initialState);

  return (
    <form action={formAction} className="space-y-3 border-t pt-4">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      {state.status !== "idle" && state.message && (
        <Alert
          className={state.status === "error" ? "border-destructive/30 bg-destructive-background text-destructive" : "border-success/30 bg-success-background text-success"}
          role={state.status === "error" ? "alert" : undefined}
        >
          <p className="font-semibold">{state.message}</p>
        </Alert>
      )}
      <div>
        <Label htmlFor={`message-${milestoneId}`} className="text-sm font-semibold">{t("milestones.submitProgressNote")}</Label>
        <Textarea id={`message-${milestoneId}`} name="message" rows={3} disabled={isPending} placeholder={t("milestones.submitProgressPlaceholder")} className="mt-1" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`type-${milestoneId}`} className="text-sm font-semibold">{t("milestones.submitEvidenceType")}</Label>
          <Input id={`type-${milestoneId}`} name="documentType" disabled={isPending} placeholder={t("milestones.submitEvidenceTypePlaceholder")} className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`files-${milestoneId}`} className="text-sm font-semibold">{t("milestones.submitFiles")}</Label>
          <Input
            id={`files-${milestoneId}`}
            name="evidence"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            disabled={isPending}
            className="mt-1"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("milestones.submitFormatHint")}</p>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{t("milestones.submitButton")}
      </Button>
    </form>
  );
}
