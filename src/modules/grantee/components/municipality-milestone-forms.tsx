"use client";

import { CheckCircle2, LoaderCircle, Plus } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import { createMilestoneAction, reviewMilestoneAction, type GranteeActionState } from "../actions/grantee-actions";

const initialState: GranteeActionState = { status: "idle" };

function Feedback({ state }: { state: GranteeActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <Alert
      className={state.status === "error" ? "border-destructive/30 bg-destructive-background text-destructive" : "border-success/30 bg-success-background text-success"}
      role={state.status === "error" ? "alert" : undefined}
    >
      <p className="font-semibold">{state.message}</p>
    </Alert>
  );
}

/** Municipality form: create a milestone on an awarded project. */
export function MilestoneCreateForm({ projectId, nextOrder }: { projectId: string; nextOrder: number }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<GranteeActionState, FormData>(createMilestoneAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="displayOrder" value={nextOrder} />
      <Feedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="milestone-title" className="text-sm font-semibold">{t("milestones.formTitle")}</Label>
          <Input id="milestone-title" name="title" required maxLength={200} disabled={isPending} className="mt-1" placeholder={t("milestones.formTitlePlaceholder")} />
        </div>
        <div>
          <Label htmlFor="milestone-due" className="text-sm font-semibold">{t("milestones.formDueDate")}</Label>
          <Input id="milestone-due" name="dueDate" type="date" required disabled={isPending} className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="milestone-description" className="text-sm font-semibold">{t("milestones.formDescription")}</Label>
        <Textarea id="milestone-description" name="description" rows={2} disabled={isPending} className="mt-1" placeholder={t("milestones.formDescriptionPlaceholder")} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="requiresEvidence" defaultChecked disabled={isPending} /> {t("milestones.formEvidenceRequired")}
      </label>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{t("milestones.formCreate")}
      </Button>
    </form>
  );
}

/** Municipality form: approve a submission or request corrections with a comment. */
export function MilestoneReviewForm({ submissionId }: { submissionId: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<GranteeActionState, FormData>(reviewMilestoneAction, initialState);
  return (
    <form action={formAction} className="space-y-2 border-t pt-3">
      <input type="hidden" name="submissionId" value={submissionId} />
      <Feedback state={state} />
      <Label htmlFor={`review-${submissionId}`} className="sr-only">{t("milestones.formReviewComment")}</Label>
      <Textarea id={`review-${submissionId}`} name="comment" rows={2} disabled={isPending} placeholder={t("milestones.formReviewPlaceholder")} />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="APPROVED" size="sm" disabled={isPending}>
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{t("milestones.formApprove")}
        </Button>
        <Button type="submit" name="decision" value="CORRECTION_REQUESTED" variant="outline" size="sm" disabled={isPending}>
          {t("milestones.formRequestCorrections")}
        </Button>
      </div>
    </form>
  );
}
