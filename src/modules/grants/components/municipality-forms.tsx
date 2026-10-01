"use client";import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "./form-error";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
import {
  deleteDraftGrantAction,
  deleteGrantRequirementAction,
  reorderGrantRequirementsAction,
  saveGrantRequirementAction,
  transitionGrantAction,
  updateGrantAction,
} from "../actions/grant-actions";
import {
  deleteEvaluationCriterionAction,
  saveEvaluationCriterionAction,
} from "@/modules/evaluations/actions/evaluation-actions";
import type { GrantStatus, RequirementType } from "../types";

function isoToLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export interface GrantFormValues {
  title: string;
  description: string;
  fundingAmount: string;
  maximumAmountPerApplicant: string;
  fundingCurrency: string;
  applicationDeadline: string;
}

export function GrantForm({ mode, grantId, initialValues, municipalityName, municipalities, basePath = "/municipality/grants" }: { mode: "create" | "edit"; grantId?: string; initialValues: GrantFormValues; municipalityName?: string | null; /** Pre-resolved municipality options (e.g. the admin registry); when omitted the form resolves the caller's memberships. */ municipalities?: Array<{ id: string; name: string }>; /** Where to redirect after save (admin management pages pass /admin/grants). */ basePath?: string }) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState(initialValues);
  const [municipalityId, setMunicipalityId] = useState(municipalities?.[0]?.id ?? "");
  const setValue = (name: keyof GrantFormValues, value: string) => setValues((current) => ({ ...current, [name]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const payload = {
      title: values.title,
      description: values.description,
      status: "DRAFT" as const,
      fundingAmount: values.fundingAmount === "" ? null : Number(values.fundingAmount),
      maximumAmountPerApplicant: values.maximumAmountPerApplicant === "" ? null : Number(values.maximumAmountPerApplicant),
      fundingCurrency: values.fundingAmount === "" ? null : values.fundingCurrency.toUpperCase(),
      applicationDeadline: localInputToIso(values.applicationDeadline),
    };
    startTransition(async () => {
      try {
        if (mode === "create") {
          const { createGrantAction, listMunicipalitiesForCurrentUserAction } = await import("../actions/grant-actions");
          let options = municipalities;
          if (!options) {
            options = await listMunicipalitiesForCurrentUserAction();
          }
          if (!options.length) throw new Error(t("grantForms.grantFormNoMunicipality"));
          const grant = await createGrantAction({ ...payload, municipalityId: municipalityId || options[0].id });
          router.push(`${basePath}/${grant.id}`);
        } else if (grantId) {
          await updateGrantAction(grantId, payload);
          router.push(`${basePath}/${grantId}`);
        }
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error && actionError.message ? actionError.message : t("grantForms.grantFormSaveError"));
      }
    });
  };

  return <form className="space-y-5" onSubmit={submit}>
    <FormError message={error} />
    <Card><CardContent className="space-y-5 p-5 sm:p-6">
      <div><Label htmlFor="grant-title">{t("grantForms.grantFormTitle")}</Label><Input id="grant-title" value={values.title} onChange={(event) => setValue("title", event.target.value)} required maxLength={200} className="mt-2" /></div>
      <div><Label htmlFor="grant-description">{t("grantForms.grantFormDescription")}</Label><Textarea id="grant-description" rows={6} value={values.description} onChange={(event) => setValue("description", event.target.value)} className="mt-2" /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><Label htmlFor="grant-funding">{t("grantForms.grantFormFunding")}</Label><Input id="grant-funding" type="number" min="0" step="0.01" value={values.fundingAmount} onChange={(event) => setValue("fundingAmount", event.target.value)} className="mt-2" /></div>
        <div><Label htmlFor="grant-currency">{t("grantForms.grantFormCurrency")}</Label><Input id="grant-currency" value={values.fundingCurrency} onChange={(event) => setValue("fundingCurrency", event.target.value)} maxLength={3} placeholder="EUR" className="mt-2" /></div>
        <div><Label htmlFor="grant-max">{t("grantForms.grantFormMax")}</Label><Input id="grant-max" type="number" min="0" step="0.01" value={values.maximumAmountPerApplicant} onChange={(event) => setValue("maximumAmountPerApplicant", event.target.value)} className="mt-2" /></div>
        <div><Label htmlFor="grant-deadline">{t("grantForms.grantFormDeadline")}</Label><Input id="grant-deadline" type="datetime-local" value={values.applicationDeadline} onChange={(event) => setValue("applicationDeadline", event.target.value)} className="mt-2" /></div>
      </div>
      {municipalities && municipalities.length > 1 ? <div><Label htmlFor="grant-municipality">{t("municipality.areaName")}</Label><Select id="grant-municipality" value={municipalityId} onChange={(event) => setMunicipalityId(event.target.value)} className="mt-2">{municipalities.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select></div> : municipalityName && <p className="text-sm text-muted-foreground">{t("grantForms.grantFormMunicipality", { name: municipalityName })}</p>}
    </CardContent></Card>
    <div className="flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={() => router.back()}>{t("grantForms.grantFormCancel")}</Button>
      <Button type="submit" disabled={isPending}>{isPending ? <><LoaderCircle className="size-4 animate-spin" />{t("grantForms.grantFormSaving")}</> : mode === "create" ? t("grantForms.grantFormCreate") : t("grantForms.grantFormSave")}</Button>
    </div>
  </form>;
}

export interface RequirementRow {
  id: string;
  name: string;
  description: string;
  type: RequirementType;
  is_required: boolean;
  configuration: Record<string, unknown>;
  display_order: number;
}

const requirementTypeOptions: RequirementType[] = ["ELIGIBILITY", "DOCUMENT", "FINANCIAL", "APPLICANT", "PROJECT", "OTHER"];

const REQUIREMENT_TYPE_KEYS: Record<RequirementType, TranslationKey> = {
  ELIGIBILITY: "grantForms.typeEligibility",
  DOCUMENT: "grantForms.typeDocument",
  FINANCIAL: "grantForms.typeFinancial",
  APPLICANT: "grantForms.typeApplicant",
  PROJECT: "grantForms.typeProject",
  OTHER: "grantForms.typeOther",
};

export function RequirementsManager({ grantId, editable, requirements }: { grantId: string; editable: boolean; requirements: RequirementRow[] }) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<RequirementRow | "new" | null>(null);

  const run = (work: () => Promise<unknown>, successMessage: string) => startTransition(async () => {
    setError(null);
    setNotice(null);
    try {
      await work();
      setNotice(successMessage);
      setEditing(null);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error && actionError.message ? actionError.message : t("grantForms.reqSaveError"));
    }
  });

  const move = (requirement: RequirementRow, direction: -1 | 1) => {
    const ordered = [...requirements].sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((item) => item.id === requirement.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    void run(() => reorderGrantRequirementsAction(grantId, ordered.map((item) => item.id)), t("grantForms.reqUpdated"));
  };

  const remove = (requirementId: string) => run(() => deleteGrantRequirementAction(grantId, requirementId), t("grantForms.reqDeleted"));

  return <div className="space-y-4">
    <FormError message={error} />
    {notice && <Alert className="border-success/30 bg-success-background text-success">{notice}</Alert>}
    {editable && <Button type="button" size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />{t("grantForms.reqAdd")}</Button>}
    {!editable && <Alert className="border-warning/30 bg-warning-background text-warning">{t("grantForms.reqLocked")}</Alert>}
    {requirements.length === 0 ? <p className="rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">{t("grantForms.reqNone")}</p> : <ol className="space-y-3">
      {[...requirements].sort((a, b) => a.display_order - b.display_order).map((requirement, index, all) => <li key={requirement.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span><h3 className="font-semibold">{requirement.name}</h3><Badge variant="outline">{t(REQUIREMENT_TYPE_KEYS[requirement.type])}</Badge>{requirement.is_required ? <Badge>{t("grantForms.reqRequired")}</Badge> : <Badge variant="outline">{t("grantForms.reqOptional")}</Badge>}</div>
          {requirement.description && <p className="mt-1 text-sm text-muted-foreground">{requirement.description}</p>}
          {Object.keys(requirement.configuration).length > 0 && <p className="mt-1 font-mono text-xs text-muted-foreground">{t("grantForms.reqAnswerKeyPrefix")} {String(requirement.configuration.answerKey ?? JSON.stringify(requirement.configuration))}</p>}
        </div>
        {editable && <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" aria-label={t("grantForms.reqMoveUp")} disabled={index === 0 || isPending} onClick={() => move(requirement, -1)}><ArrowUp className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" aria-label={t("grantForms.reqMoveDown")} disabled={index === all.length - 1 || isPending} onClick={() => move(requirement, 1)}><ArrowDown className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(requirement)}><Pencil className="size-4" />{t("grantForms.reqEdit")}</Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={() => remove(requirement.id)}><Trash2 className="size-4" /><span className="sr-only">{t("grantForms.reqDelete")}</span></Button>
        </div>}
      </li>)}
    </ol>}
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} title={editing === "new" ? t("grantForms.reqAddTitle") : t("grantForms.reqEditTitle")} description={t("grantForms.reqDocWarning")}>
      {editing !== null && <RequirementForm grantId={grantId} requirement={editing === "new" ? null : editing} nextOrder={Math.max(0, ...requirements.map((item) => item.display_order)) + 1} onDone={() => setEditing(null)} />}
    </Dialog>
  </div>;
}

function RequirementForm({ grantId, requirement, nextOrder, onDone }: { grantId: string; requirement: RequirementRow | null; nextOrder: number; onDone: () => void }) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(requirement?.name ?? "");
  const [description, setDescription] = useState(requirement?.description ?? "");
  const [type, setType] = useState<RequirementType>(requirement?.type ?? "APPLICANT");
  const [isRequired, setIsRequired] = useState(requirement?.is_required ?? true);
  const [answerKey, setAnswerKey] = useState(typeof requirement?.configuration.answerKey === "string" ? (requirement.configuration as { answerKey?: string }).answerKey ?? "" : "");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const configuration: Record<string, unknown> = {};
    if (answerKey.trim()) configuration.answerKey = answerKey.trim();
    startTransition(async () => {
      try {
        await saveGrantRequirementAction(grantId, { name, description, type, isRequired, configuration, displayOrder: requirement?.display_order ?? nextOrder }, requirement?.id);
        onDone();
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error && actionError.message ? actionError.message : t("grantForms.reqSaveError"));
      }
    });
  };

  return <form className="space-y-4" onSubmit={submit}>
    <FormError message={error} />
    <div><Label htmlFor="requirement-name">{t("grantForms.reqName")}</Label><Input id="requirement-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} className="mt-2" /></div>
    <div><Label htmlFor="requirement-description">{t("grantForms.reqDescriptionLabel")}</Label><Textarea id="requirement-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2" /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="requirement-type">{t("grantForms.reqType")}</Label><Select id="requirement-type" value={type} onChange={(event) => setType(event.target.value as RequirementType)} className="mt-2">{requirementTypeOptions.map((option) => <option key={option} value={option}>{t(REQUIREMENT_TYPE_KEYS[option])}</option>)}</Select></div>
      <label className="flex items-end gap-2 pb-2 text-sm font-medium"><Checkbox checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} />{t("grantForms.reqRequired")}</label>
    </div>
    <div><Label htmlFor="requirement-answer-key">{t("grantForms.reqAnswerKey")}</Label><Input id="requirement-answer-key" value={answerKey} onChange={(event) => setAnswerKey(event.target.value)} placeholder="e.g. registeredInMunicipality" className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">{t("grantForms.reqAnswerKeyHelp")}</p></div>
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onDone}>{t("grantForms.grantFormCancel")}</Button><Button type="submit" disabled={isPending}>{isPending ? <><LoaderCircle className="size-4 animate-spin" />{t("grantForms.grantFormSaving")}</> : t("grantForms.reqSave")}</Button></div>
  </form>;
}

export interface CriterionRow {
  id: string;
  name: string;
  description: string;
  maximumScore: number;
  weight: number;
  displayOrder: number;
}

export function CriteriaManager({ grantId, editable, criteria }: { grantId: string; editable: boolean; criteria: CriterionRow[] }) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<CriterionRow | "new" | null>(null);

  const run = (work: () => Promise<unknown>, successMessage: string) => startTransition(async () => {
    setError(null);
    setNotice(null);
    try {
      await work();
      setNotice(successMessage);
      setEditing(null);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error && actionError.message ? actionError.message : t("grantForms.critSaveError"));
    }
  });

  const move = (criterion: CriterionRow, direction: -1 | 1) => {
    const ordered = [...criteria].sort((a, b) => a.displayOrder - b.displayOrder);
    const index = ordered.findIndex((item) => item.id === criterion.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    void run(async () => {
      for (const [position, item] of ordered.entries()) {
        await saveEvaluationCriterionAction(grantId, { grantId, name: item.name, description: item.description, maximumScore: item.maximumScore, weight: item.weight, displayOrder: position }, item.id);
      }
    }, t("grantForms.critOrderUpdated"));
  };

  const remove = (criterionId: string) => run(() => deleteEvaluationCriterionAction(grantId, criterionId), t("grantForms.critDeleted"));
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);

  return <div className="space-y-4">
    <FormError message={error} />
    {notice && <Alert className="border-success/30 bg-success-background text-success">{notice}</Alert>}
    {editable && <Button type="button" size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />{t("grantForms.critAdd")}</Button>}
    {!editable && <Alert className="border-warning/30 bg-warning-background text-warning">{t("grantForms.critLocked")}</Alert>}
    {criteria.length > 0 && <p className="text-sm text-muted-foreground">{t("grantForms.critTotalWeight", { weight: totalWeight })}</p>}
    {criteria.length === 0 ? <p className="rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">{t("grantForms.critNone")}</p> : <ol className="space-y-3">
      {[...criteria].sort((a, b) => a.displayOrder - b.displayOrder).map((criterion, index, all) => <li key={criterion.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span><h3 className="font-semibold">{criterion.name}</h3><Badge variant="outline">{t("grantForms.critMaxBadge", { score: criterion.maximumScore })}</Badge><Badge variant="outline">{t("grantForms.critWeightBadge", { weight: criterion.weight })}</Badge></div>
          {criterion.description && <p className="mt-1 text-sm text-muted-foreground">{criterion.description}</p>}
        </div>
        {editable && <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" aria-label={t("grantForms.critMoveUp")} disabled={index === 0 || isPending} onClick={() => move(criterion, -1)}><ArrowUp className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" aria-label={t("grantForms.critMoveDown")} disabled={index === all.length - 1 || isPending} onClick={() => move(criterion, 1)}><ArrowDown className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(criterion)}><Pencil className="size-4" />{t("grantForms.critEdit")}</Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={() => remove(criterion.id)}><Trash2 className="size-4" /><span className="sr-only">{t("grantForms.critDelete")}</span></Button>
        </div>}
      </li>)}
    </ol>}
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} title={editing === "new" ? t("grantForms.critAddTitle") : t("grantForms.critEditTitle")} description={t("grantForms.critDialogDescription")}>
      {editing !== null && <CriterionForm grantId={grantId} criterion={editing === "new" ? null : editing} nextOrder={Math.max(0, ...criteria.map((item) => item.displayOrder)) + 1} onDone={() => setEditing(null)} />}
    </Dialog>
  </div>;
}

function CriterionForm({ grantId, criterion, nextOrder, onDone }: { grantId: string; criterion: CriterionRow | null; nextOrder: number; onDone: () => void }) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(criterion?.name ?? "");
  const [description, setDescription] = useState(criterion?.description ?? "");
  const [maximumScore, setMaximumScore] = useState(String(criterion?.maximumScore ?? 10));
  const [weight, setWeight] = useState(String(criterion?.weight ?? 1));
  const [displayOrder, setDisplayOrder] = useState(String(criterion?.displayOrder ?? nextOrder));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveEvaluationCriterionAction(grantId, { grantId, name, description, maximumScore: Number(maximumScore), weight: Number(weight), displayOrder: Number(displayOrder) }, criterion?.id);
        onDone();
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error && actionError.message ? actionError.message : t("grantForms.critSaveError"));
      }
    });
  };

  return <form className="space-y-4" onSubmit={submit}>
    <FormError message={error} />
    <div><Label htmlFor="criterion-name">{t("grantForms.critName")}</Label><Input id="criterion-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} className="mt-2" /></div>
    <div><Label htmlFor="criterion-description">{t("grantForms.critDescriptionLabel")}</Label><Textarea id="criterion-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2" /></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <div><Label htmlFor="criterion-max">{t("grantForms.critMax")}</Label><Input id="criterion-max" type="number" min="0" step="0.01" value={maximumScore} onChange={(event) => setMaximumScore(event.target.value)} required className="mt-2" /></div>
      <div><Label htmlFor="criterion-weight">{t("grantForms.critWeight")}</Label><Input id="criterion-weight" type="number" min="0" step="0.0001" value={weight} onChange={(event) => setWeight(event.target.value)} required className="mt-2" /></div>
      <div><Label htmlFor="criterion-order">{t("grantForms.critOrder")}</Label><Input id="criterion-order" type="number" min="0" step="1" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} className="mt-2" /></div>
    </div>
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onDone}>{t("grantForms.grantFormCancel")}</Button><Button type="submit" disabled={isPending}>{isPending ? <><LoaderCircle className="size-4 animate-spin" />{t("grantForms.grantFormSaving")}</> : t("grantForms.critSave")}</Button></div>
  </form>;
}

const LIFECYCLE_LABEL_KEYS: Record<"PUBLISHED" | "CLOSED" | "ARCHIVED" | "DELETE", TranslationKey> = {
  PUBLISHED: "grantForms.lifePublishLabel",
  CLOSED: "grantForms.lifeCloseLabel",
  ARCHIVED: "grantForms.lifeArchiveLabel",
  DELETE: "grantForms.lifeDeleteLabel",
};

const LIFECYCLE_DESCRIPTION_KEYS: Record<"PUBLISHED" | "CLOSED" | "ARCHIVED" | "DELETE", TranslationKey> = {
  PUBLISHED: "grantForms.lifePublishDesc",
  CLOSED: "grantForms.lifeCloseDesc",
  ARCHIVED: "grantForms.lifeArchiveDesc",
  DELETE: "grantForms.lifeDeleteDesc",
};

export function LifecycleControls({ grantId, status, basePath = "/municipality/grants" }: { grantId: string; status: GrantStatus; basePath?: string }) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"PUBLISHED" | "CLOSED" | "ARCHIVED" | "DELETE" | null>(null);

  const act = (action: () => Promise<unknown>) => startTransition(async () => {
    setError(null);
    try {
      await action();
      setConfirm(null);
      if (confirm === "DELETE") router.push(basePath);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error && actionError.message ? actionError.message : t("grantForms.lifeConfirm"));
    }
  });

  return <div className="space-y-3">
    <FormError message={error} />
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && <Button type="button" size="sm" disabled={isPending} onClick={() => setConfirm("PUBLISHED")}>{t("grantForms.lifePublish")}</Button>}
      {status === "PUBLISHED" && <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => setConfirm("CLOSED")}>{t("grantForms.lifeClose")}</Button>}
      {status === "CLOSED" && <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => setConfirm("ARCHIVED")}>{t("grantForms.lifeArchive")}</Button>}
      {status === "DRAFT" && <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={isPending} onClick={() => setConfirm("DELETE")}>{t("grantForms.lifeDeleteDraft")}</Button>}
      {isPending && <LoaderCircle className="size-4 animate-spin" aria-label={t("grantForms.lifeWorking")} />}
    </div>
    <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }} title={confirm ? t(LIFECYCLE_LABEL_KEYS[confirm]) : ""} description={confirm ? t(LIFECYCLE_DESCRIPTION_KEYS[confirm]) : undefined}>
      {confirm && <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setConfirm(null)}>{t("grantForms.lifeCancel")}</Button>
        <Button type="button" variant={confirm === "DELETE" ? "destructive" : "default"} disabled={isPending} onClick={() => act(async () => {
          if (confirm === "DELETE") await deleteDraftGrantAction(grantId);
          else await transitionGrantAction(grantId, confirm);
        })}>{confirm === "DELETE" ? t("grantForms.lifeDeleteConfirm") : t("grantForms.lifeConfirm")}</Button>
      </div>}
    </Dialog>
  </div>;
}
