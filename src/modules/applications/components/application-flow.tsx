"use client";

/**
 * Real application wizard.
 *
 * Data flow: the page loads/creates the draft application server-side and
 * passes the persisted row here; every answer change is persisted through
 * `updateDraftApplicationAction` (authoritative server validation), document
 * uploads go through `uploadApplicationDocumentAction` into private Storage,
 * and submit calls `submitApplicationAction`, which enforces all server-side
 * prerequisites before flipping the status. No mock state remains.
 */

import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, FileText, Landmark, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/shared/file-upload";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
import { submitApplicationAction, updateDraftApplicationAction } from "../actions/application-actions";

export interface WizardGrant {
  id: string;
  title: string;
  description: string;
  fundingAmount: number | null;
  fundingCurrency: string | null;
  applicationDeadline: string | null;
  municipalityName: string;
  requirements: Array<{ id: string; name: string; description: string; type: string; isRequired: boolean; configuration: Record<string, unknown> }>;
}

export interface WizardDocument {
  id: string;
  requirementId: string | null;
  fileName: string;
  fileSizeBytes: number;
}

export interface WizardApplication {
  id: string;
  status: string;
  submittedAt: string | null;
  answers: Record<string, unknown>;
  documents: WizardDocument[];
}

type Screen = "applicant" | "plan" | "documents" | "review" | "submitted";

const steps: { id: Screen; labelKey: TranslationKey }[] = [
  { id: "applicant", labelKey: "wizard.stepApplicant" },
  { id: "plan", labelKey: "applicationFlow.stepBusinessPlan" },
  { id: "documents", labelKey: "applicationFlow.stepDocuments" },
  { id: "review", labelKey: "applicationFlow.stepReview" },
];

const screenTitle: Record<Screen, TranslationKey> = {
  applicant: "wizard.titleApplicant",
  plan: "wizard.titlePlan",
  documents: "wizard.titleDocuments",
  review: "wizard.titleReview",
  submitted: "wizard.applicationSubmitted",
};

const ANSWER_FIELDS: Array<{ key: string; step: Screen; labelKey: TranslationKey; kind: "text" | "textarea" | "date" | "number" }> = [
  { key: "organisationName", step: "applicant", labelKey: "wizard.orgName", kind: "text" },
  { key: "registrationNumber", step: "applicant", labelKey: "wizard.registrationNumber", kind: "text" },
  { key: "yearEstablished", step: "applicant", labelKey: "wizard.yearEstablished", kind: "number" },
  { key: "contactName", step: "applicant", labelKey: "auth.fullName", kind: "text" },
  { key: "contactEmail", step: "applicant", labelKey: "auth.email", kind: "text" },
  { key: "contactPhone", step: "applicant", labelKey: "wizard.phoneNumber", kind: "text" },
  { key: "projectTitle", step: "plan", labelKey: "applicationFlow.fieldProjectTitle", kind: "text" },
  { key: "projectDescription", step: "plan", labelKey: "applicationFlow.fieldWhatWillYouDo", kind: "textarea" },
  { key: "communityImpact", step: "plan", labelKey: "applicationFlow.fieldWhyCommunity", kind: "textarea" },
  { key: "expectedReach", step: "plan", labelKey: "applicationFlow.fieldReach", kind: "number" },
  { key: "projectStart", step: "plan", labelKey: "applicationFlow.fieldProjectStart", kind: "date" },
  { key: "budgetAmount", step: "plan", labelKey: "wizard.totalRequested", kind: "number" },
];

const fixedAnswerKeys = new Set(ANSWER_FIELDS.map((field) => field.key));

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function ApplicationFlow({ grant, application }: { grant: WizardGrant; application: WizardApplication }) {
  const t = useT();
  const router = useRouter();
  const firstIncomplete = application.status === "DRAFT" ? steps[0].id : "review";
  const [screen, setScreen] = useState<Screen>(firstIncomplete);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [key, value] of Object.entries(application.answers ?? {})) {
      if (typeof value === "string") initial[key] = value;
    }
    return initial;
  });
  const [documents, setDocuments] = useState<WizardDocument[]>(application.documents);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = steps.findIndex((step) => step.id === screen);
  const completion = screen === "submitted" ? 100 : Math.round(((Math.max(currentStep, 0) + 1) / steps.length) * 100);

  const persistAnswers = (next: Record<string, string>) => {
    setAnswers(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await updateDraftApplicationAction(application.id, next);
        } catch (saveError) {
          setError(saveError instanceof Error && saveError.message ? saveError.message : "Unable to save your progress.");
        }
      });
    }, 600);
  };

  const uploadDocument = async (requirementId: string, file: File) => {
    setError(null);
    startTransition(async () => {
      try {
        const { uploadApplicationDocumentAction } = await import("@/modules/documents/actions/document-actions");
        const row = await uploadApplicationDocumentAction(application.id, requirementId, file, file.name.slice(0, 100));
        setDocuments((current) => [...current.filter((document) => document.requirementId !== requirementId), { id: row.id, requirementId, fileName: row.file_name, fileSizeBytes: row.file_size_bytes ?? 0 }]);
        router.refresh();
      } catch (uploadError) {
        setError(uploadError instanceof Error && uploadError.message ? uploadError.message : "The document could not be uploaded.");
      }
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateDraftApplicationAction(application.id, answers);
        await submitApplicationAction(application.id);
        setScreen("submitted");
      } catch (submitError) {
        setError(submitError instanceof Error && submitError.message ? submitError.message : "The application could not be submitted.");
      }
    });
  };

  if (screen === "submitted") {
    return <ApplicantShell><main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="py-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-background text-success"><CheckCircle2 className="size-9" /></span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-success">{t("wizard.applicationSubmitted")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("wizard.thankYou")}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">{t("wizard.submittedDescription").replace("{grant}", grant.title)}</p>
        <Card className="mt-8 text-left"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("wizard.applicationReference")}</p><p className="mt-1 font-mono text-lg font-bold">{application.id.slice(0, 8).toUpperCase()}</p></CardContent></Card>
        <Link href={`/applications/${application.id}`} className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("wizard.viewStatus")} <ArrowRight className="size-4" /></Link>
      </div>
    </main></ApplicantShell>;
  }

  const documentRequirements = grant.requirements.filter((requirement) => requirement.type === "DOCUMENT");
  const configuredAnswerFields = grant.requirements.flatMap((requirement) => {
    const answerKey = requirement.configuration.answerKey;
    if (requirement.type === "DOCUMENT" || typeof answerKey !== "string" || !answerKey.trim() || fixedAnswerKeys.has(answerKey)) return [];
    return [{
      key: answerKey,
      label: requirement.name,
      description: requirement.description,
      isRequired: requirement.isRequired,
      step: requirement.type === "PROJECT" || requirement.type === "FINANCIAL" ? "plan" as const : "applicant" as const,
    }];
  }).filter((field, index, fields) => fields.findIndex((candidate) => candidate.key === field.key) === index);
  const requiredAnswerKeys = grant.requirements.filter((requirement) => requirement.isRequired && requirement.type !== "DOCUMENT" && typeof requirement.configuration.answerKey === "string").map((requirement) => requirement.configuration.answerKey as string);
  const missingAnswers = requiredAnswerKeys.filter((key) => !(answers[key] ?? "").trim());
  const missingDocuments = documentRequirements.filter((requirement) => requirement.isRequired && !documents.some((document) => document.requirementId === requirement.id));
  const canSubmit = missingAnswers.length === 0 && missingDocuments.length === 0 && confirmed;

  return <ApplicantShell><main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Link href={`/applications/${application.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" />{t("wizard.leaveApplication")}</Link>
        <div className="mt-6"><p className="text-sm font-semibold">{t("applicationFlow.stepOf", { current: currentStep + 1, total: steps.length })}</p><Progress className="mt-2" value={completion} /></div>
        <ol className="mt-6 space-y-1" aria-label={t("wizard.applicationProgress")}>
          {steps.map((step, index) => (
            <li key={step.id}>
              <button type="button" onClick={() => setScreen(step.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${index === currentStep ? "bg-primary font-semibold text-primary-foreground" : index < currentStep ? "text-primary hover:bg-secondary" : "text-muted-foreground hover:bg-muted"}`}>
                <span className={`grid size-6 place-items-center rounded-full text-xs ${index < currentStep ? "bg-success text-white" : index === currentStep ? "bg-card/20" : "bg-muted text-muted-foreground"}`}>{index < currentStep ? <Check className="size-4" /> : index + 1}</span>
                {t(step.labelKey)}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-7 rounded-lg border bg-card p-4 text-sm text-muted-foreground"><p className="font-semibold text-foreground">{t("wizard.draftSaved")}</p><p className="mt-1">{t("wizard.draftSavedHint")}</p></div>
      </aside>
      <section>
        <div className="mb-6 flex items-center justify-between gap-4 border-b pb-5">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">{grant.title}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t(screenTitle[screen])}</h1></div>
          <span className="hidden text-sm text-muted-foreground sm:block">{completion}% {t("wizard.complete")}</span>
        </div>

        {error && <Alert className="mb-5 border-destructive/30 bg-destructive-background text-destructive" role="alert"><p className="font-semibold">{error}</p></Alert>}

        {screen === "applicant" && (
          <Card><CardContent className="p-5 sm:p-7"><p className="mb-6 text-sm leading-6 text-muted-foreground">{t("wizard.applicantInfoDescription")}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {ANSWER_FIELDS.filter((field) => field.step === "applicant").map((field) => (
                <label key={field.key} className="block text-sm font-semibold">{t(field.labelKey)}
                  <Input className="mt-2" value={answers[field.key] ?? ""} inputMode={field.kind === "number" ? "numeric" : undefined} type={field.kind === "date" ? "date" : "text"} onChange={(event) => persistAnswers({ ...answers, [field.key]: event.target.value })} />
                </label>
              ))}
              {configuredAnswerFields.filter((field) => field.step === "applicant").map((field) => (
                <label key={field.key} className="block text-sm font-semibold">{field.label}{field.isRequired ? " *" : ""}
                  {field.description && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.description}</span>}
                  <Input className="mt-2" value={answers[field.key] ?? ""} required={field.isRequired} onChange={(event) => persistAnswers({ ...answers, [field.key]: event.target.value })} />
                </label>
              ))}
            </div>
          </CardContent></Card>
        )}

        {screen === "plan" && (
          <Card><CardContent className="p-5 sm:p-7"><p className="mb-6 text-sm leading-6 text-muted-foreground">{t("applicationFlow.keepClear")}</p>
            <div className="space-y-5">
              {ANSWER_FIELDS.filter((field) => field.step === "plan").map((field) => (
                <label key={field.key} className="block text-sm font-semibold">{t(field.labelKey)}
                  {field.kind === "textarea" ? (
                    <Textarea className="mt-2" rows={4} value={answers[field.key] ?? ""} onChange={(event) => persistAnswers({ ...answers, [field.key]: event.target.value })} />
                  ) : (
                    <Input className="mt-2" value={answers[field.key] ?? ""} inputMode={field.kind === "number" ? "numeric" : undefined} type={field.kind === "date" ? "date" : "text"} onChange={(event) => persistAnswers({ ...answers, [field.key]: event.target.value })} />
                  )}
                </label>
              ))}
              {configuredAnswerFields.filter((field) => field.step === "plan").map((field) => (
                <label key={field.key} className="block text-sm font-semibold">{field.label}{field.isRequired ? " *" : ""}
                  {field.description && <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.description}</span>}
                  <Input className="mt-2" value={answers[field.key] ?? ""} required={field.isRequired} onChange={(event) => persistAnswers({ ...answers, [field.key]: event.target.value })} />
                </label>
              ))}
            </div>
          </CardContent></Card>
        )}

        {screen === "documents" && (
          <Card><CardContent className="p-5 sm:p-7"><p className="mb-6 text-sm leading-6 text-muted-foreground">{t("wizard.documentsDescription")}</p>
            {documentRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("grants.noRequirementsPublished")}</p>
            ) : (
              <div className="space-y-6">
                {documentRequirements.map((requirement) => {
                  const uploaded = documents.find((document) => document.requirementId === requirement.id);
                  return (
                    <div key={requirement.id} className="rounded-xl border p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><FileText className="size-5" /></span>
                        <div>
                          <h2 className="font-semibold">{requirement.name}</h2>
                          <p className="text-sm text-muted-foreground">{requirement.isRequired ? t("documents.required") : t("statusLabels.requirement.OPTIONAL")}</p>
                        </div>
                      </div>
                      <FileUpload
                        accept=".pdf,.jpg,.jpeg,.png"
                        fileName={uploaded?.fileName}
                        fileSize={uploaded ? formatFileSize(uploaded.fileSizeBytes) : undefined}
                        state={uploaded ? "success" : isPending ? "uploading" : "idle"}
                        onFilesSelected={(files) => { const file = files.item(0); if (file) void uploadDocument(requirement.id, file); }}
                        onRemove={undefined}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent></Card>
        )}

        {screen === "review" && (
          <div className="space-y-5">
            <Card><CardHeader><CardTitle>{t("wizard.applicationSummary")}</CardTitle></CardHeader><CardContent className="space-y-4">
              <ReviewRow label={t("applications.grant")} value={grant.title} />
              {ANSWER_FIELDS.filter((field) => (answers[field.key] ?? "").trim()).slice(0, 8).map((field) => (
                <ReviewRow key={field.key} label={t(field.labelKey)} value={(answers[field.key] as string).slice(0, 160)} />
              ))}
              {configuredAnswerFields.filter((field) => (answers[field.key] ?? "").trim()).map((field) => (
                <ReviewRow key={field.key} label={field.label} value={(answers[field.key] ?? "").slice(0, 160)} />
              ))}
              <ReviewRow label={t("documents.documents")} value={`${documents.length}`} />
            </CardContent></Card>
            {(missingAnswers.length > 0 || missingDocuments.length > 0) && (
              <Alert className="border-warning/30 bg-warning-background text-warning" role="alert">
                <p className="flex items-start gap-2 text-sm"><CircleAlert className="mt-0.5 size-4 shrink-0" />{t("wizard.missingBeforeSubmit")} {missingAnswers.length > 0 && missingDocuments.length > 0 ? t("wizard.missingAnswersAndDocuments") : missingAnswers.length > 0 ? t("wizard.missingAnswers") : t("wizard.missingDocumentsList")}</p>
              </Alert>
            )}
            <label className={`flex items-start gap-3 rounded-xl border p-4 ${confirmed ? "border-success/40 bg-success-background" : "border-warning/40 bg-warning-background"}`}>
              <Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 size-5 shrink-0" />
              <span className={`text-sm leading-6 ${confirmed ? "text-success" : "text-foreground"}`}><span className="font-semibold">{t("wizard.beforeYouSubmit")}</span> {t("wizard.confirmAccuracy")}</span>
            </label>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => setScreen(steps[Math.max(currentStep - 1, 0)].id)} disabled={currentStep === 0}><ArrowLeft className="size-4" />{t("common.back")}</Button>
          {screen === "review" ? (
            <Button type="button" disabled={!canSubmit || isPending} onClick={submit}>{isPending ? <><Send className="size-4 animate-pulse" />{t("applicationFlow.submitting")}</> : <>{t("applicationFlow.submitApplication")} <Send className="size-4" /></>}</Button>
          ) : (
            <Button type="button" onClick={() => setScreen(steps[Math.min(currentStep + 1, steps.length - 1)].id)}>{t("applicationFlow.saveAndContinue")} <ArrowRight className="size-4" /></Button>
          )}
        </div>
      </section>
    </div>
  </main></ApplicantShell>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div></div>;
}
