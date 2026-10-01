"use client";

import { AlertTriangle, BadgeCheck, Ban, Check, CircleAlert, FileWarning, LoaderCircle, RefreshCw, ScanSearch, Sparkles } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/i18n/format";
import { runApplicationVerificationAction, type RunVerificationState } from "../actions/verification-actions";

const initialState: RunVerificationState = { status: "idle" };

export interface VerificationPanelDocument {
  id: string;
  fileName: string;
  documentType: string | null;
  status: string | null;
  confidence: number | null;
  notes: string | null;
  inconsistencies: string[];
}

export interface VerificationPanelRequirement {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  result: "PASS" | "FAIL" | "NEEDS_REVIEW" | "NOT_VERIFIABLE" | string;
  source: "DETERMINISTIC" | "AI" | "SYSTEM" | string;
  explanation: string | null;
  evidence: Array<{ source: string; quote: string; value: string }>;
  confidence: number | null;
}

export interface VerificationPanelProps {
  applicationId: string;
  overview: {
    status: string;
    summary: string | null;
    errorMessage: string | null;
    inconsistencies: Array<{ note?: string; field?: string; applicationValue?: string | null; documentValue?: string | null }>;
    missingDocumentRequirementNames: string[];
    completedAt: string | null;
  } | null;
  documents: VerificationPanelDocument[];
  requirements: VerificationPanelRequirement[];
  missingRequirementNames: string[];
}

const resultIcon: Record<string, typeof Check> = {
  PASS: Check,
  FAIL: Ban,
  NEEDS_REVIEW: AlertTriangle,
  NOT_VERIFIABLE: CircleAlert,
};

const resultBadge: Record<string, string> = {
  PASS: "bg-success-background text-success",
  FAIL: "bg-destructive-background text-destructive",
  NEEDS_REVIEW: "bg-warning-background text-warning",
  NOT_VERIFIABLE: "bg-secondary text-secondary-foreground",
};

const documentIcon: Record<string, typeof Check> = {
  VERIFIED: BadgeCheck,
  FLAGGED: FileWarning,
  UNREADABLE: FileWarning,
  NEEDS_REVIEW: FileWarning,
};

const documentBadge: Record<string, string> = {
  VERIFIED: "bg-success-background text-success",
  FLAGGED: "bg-warning-background text-warning",
  UNREADABLE: "bg-destructive-background text-destructive",
  NEEDS_REVIEW: "bg-warning-background text-warning",
};

const overviewBadge: Record<string, string> = {
  NOT_STARTED: "bg-secondary text-secondary-foreground",
  PROCESSING: "bg-warning-background text-warning",
  COMPLETED: "bg-success-background text-success",
  NEEDS_REVIEW: "bg-warning-background text-warning",
  FAILED: "bg-destructive-background text-destructive",
};

function formatConfidence(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}%`;
}

/**
 * AI verification panel for municipal reviewers.
 *
 * Visual contract: results come from three clearly separated sources —
 * deterministic rules, AI document analysis, and the human reviewer. AI rows
 * are always labeled "AI-assisted" and never render as authoritative
 * green/authoritative verdicts without the reviewer's confirmation.
 */
export function VerificationPanel({ applicationId, overview, documents, requirements, missingRequirementNames }: VerificationPanelProps) {
  const t = useT();
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<RunVerificationState, FormData>(runApplicationVerificationAction, initialState);
  const liveStatus = state.status === "success" && state.verificationStatus ? state.verificationStatus : overview?.status ?? "NOT_STARTED";
  const isProcessing = isPending || liveStatus === "PROCESSING";
  const hasResult = overview !== null || state.status === "success";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <ScanSearch className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>{t("verification.panelTitle")}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${overviewBadge[liveStatus] ?? "bg-secondary text-secondary-foreground"}`}>
            {t(`verification.overview.${liveStatus}` as Parameters<typeof t>[0])}
          </span>
          <form action={formAction}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <Button type="submit" variant="outline" size="sm" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  {t("verification.running")}
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  {hasResult ? t("verification.rerun") : t("verification.run")}
                </>
              )}
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {state.status === "error" && (
          <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert">
            <p className="font-semibold">{state.message}</p>
          </Alert>
        )}
        {overview?.errorMessage && (
          <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert">
            <p className="font-semibold">{overview.errorMessage}</p>
          </Alert>
        )}

        {!hasResult && !isProcessing && (
          <p className="text-sm text-muted-foreground">{t("verification.notRunYet")}</p>
        )}

        {hasResult && (
          <>
            {/* Documents */}
            <section aria-label={t("verification.documentsSection")} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.documentsSection")}</h3>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("verification.noDocuments")}</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((document) => {
                    const Icon = documentIcon[document.status ?? ""] ?? CircleAlert;
                    const badge = documentBadge[document.status ?? ""] ?? "bg-secondary text-secondary-foreground";
                    const confidence = formatConfidence(document.confidence);
                    return (
                      <li key={document.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className="truncate text-sm font-medium">{document.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{t("verification.aiAssisted")}</Badge>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{t(`verification.documentStatus.${document.status ?? "NEEDS_REVIEW"}` as Parameters<typeof t>[0])}</span>
                          </div>
                        </div>
                        {document.notes && <p className="mt-2 text-sm text-muted-foreground">{document.notes}</p>}
                        {document.inconsistencies.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
                            {document.inconsistencies.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        )}
                        {confidence && <p className="mt-1 text-xs text-muted-foreground">{t("verification.confidence")}: {confidence}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Requirements */}
            <section aria-label={t("verification.requirementsSection")} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.requirementsSection")}</h3>
              {requirements.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("verification.noRequirements")}</p>
              ) : (
                <ul className="space-y-2">
                  {requirements.map((requirement) => {
                    const Icon = resultIcon[requirement.result] ?? CircleAlert;
                    const badge = resultBadge[requirement.result] ?? "bg-secondary text-secondary-foreground";
                    const isAi = requirement.source === "AI";
                    return (
                      <li key={requirement.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className="truncate text-sm font-medium">{requirement.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{isAi ? t("verification.aiAssisted") : t("verification.deterministic")}</Badge>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{t(`verification.result.${requirement.result}` as Parameters<typeof t>[0])}</span>
                          </div>
                        </div>
                        {requirement.explanation && <p className="mt-2 text-sm text-muted-foreground">{requirement.explanation}</p>}
                        {requirement.evidence.length > 0 && (
                          <ul className="mt-2 space-y-1 rounded-md bg-secondary/40 p-2">
                            {requirement.evidence.map((item, index) => (
                              <li key={index} className="text-xs text-secondary-foreground">
                                <span className="font-semibold">{item.source === "DOCUMENT" ? t("verification.evidenceDocument") : t("verification.evidenceApplication")}:</span> {item.quote}
                                {item.value ? ` — ${item.value}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                        {requirement.confidence !== null && (
                          <p className="mt-1 text-xs text-muted-foreground">{t("verification.confidence")}: {formatConfidence(requirement.confidence)}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {missingRequirementNames.length > 0 && (
                <Alert className="border-destructive/30 bg-destructive-background text-destructive" role="alert">
                  <p className="font-semibold">
                    {t("verification.missingDocuments")}: {missingRequirementNames.join(", ")}
                  </p>
                </Alert>
              )}
            </section>

            {/* AI summary */}
            {overview?.summary && (
              <section aria-label={t("verification.summarySection")} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.summarySection")}</h3>
                <blockquote className="flex gap-2 rounded-md border-l-4 border-primary/50 bg-secondary/40 p-3 text-sm leading-6 text-secondary-foreground">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{overview.summary}</span>
                </blockquote>
              </section>
            )}

            {/* Issues found */}
            {overview && overview.inconsistencies.length > 0 && (
              <section aria-label={t("verification.issuesSection")} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.issuesSection")}</h3>
                <ul className="space-y-1">
                  {overview.inconsistencies.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                      <span>{item.note ?? item.field}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="text-xs text-muted-foreground">
              {t("verification.disclaimer")}
              {overview?.completedAt ? ` · ${t("verification.completedAt")}: ${formatDateTime(locale, overview.completedAt)}` : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
