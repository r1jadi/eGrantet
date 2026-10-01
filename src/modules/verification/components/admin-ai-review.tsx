"use client";

import { AlertTriangle, BadgeCheck, CircleAlert, FileWarning, ScanSearch, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";

const documentStateStyles: Record<string, string> = {
  VERIFIED: "bg-success-background text-success",
  FLAGGED: "bg-warning-background text-warning",
  UNREADABLE: "bg-destructive-background text-destructive",
  NEEDS_REVIEW: "bg-warning-background text-warning",
};

interface AiDocumentInput {
  id: string;
  fileName: string;
  documentType: string | null;
  status: string | null;
  confidence: number | null;
  notes: string | null;
  inconsistencies: string[];
}

interface AiRequirementInput {
  id: string;
  requirementName: string;
  result: string;
  source: string;
  explanation: string | null;
  evidence: Array<{ source: string; quote: string; value: string }>;
  confidence: number | null;
}

interface AiOverviewInput {
  summary: string | null;
  completedAt: string | null;
}

/**
 * Deep AI review surface: goes beyond the status badge and shows exactly what
 * the AI produced per document (state, confidence, findings, notes) and per
 * requirement (result, source, explanation, supporting evidence). AI output is
 * presented as reviewer assistance — never as a decision.
 */
export function AdminAiReviewSection({ documents, requirements, overview }: { documents: AiDocumentInput[]; requirements: AiRequirementInput[]; overview: AiOverviewInput | null }) {
  const t = useT();
  const analyzed = documents.filter((document) => document.status !== null);
  const aiRequirements = requirements.filter((requirement) => requirement.source === "AI");
  const hasAiOutput = analyzed.length > 0 || aiRequirements.length > 0 || Boolean(overview?.summary);

  if (!hasAiOutput) {
    return (
      <section aria-label={t("aiReview.title")} className="rounded-xl border border-dashed bg-card p-6">
        <div className="flex items-center gap-2">
          <ScanSearch className="size-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight">{t("aiReview.title")}</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("aiReview.notRunYet")}</p>
      </section>
    );
  }

  return (
    <section aria-label={t("aiReview.title")} className="rounded-xl border border-primary/25 bg-gradient-to-br from-secondary/50 to-card shadow-[0_1px_2px_rgba(16,35,61,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold tracking-tight">{t("aiReview.title")}</h2>
            <p className="text-xs text-muted-foreground">{t("aiReview.description")}</p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">{t("verification.aiAssisted")}</Badge>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* AI synthesis summary */}
        {overview?.summary && (
          <div className="rounded-lg border-l-4 border-primary/50 bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("aiReview.synthesisHeading")}</p>
            <blockquote className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground">{overview.summary}</blockquote>
          </div>
        )}

        {/* Per-document AI findings */}
        {analyzed.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">{t("aiReview.documentsHeading")}</h3>
            <ul className="mt-2 space-y-3">
              {analyzed.map((document) => {
                const stateClass = documentStateStyles[document.status ?? ""] ?? "bg-secondary text-secondary-foreground";
                const isProblem = document.status === "FLAGGED" || document.status === "UNREADABLE" || (document.inconsistencies.length > 0);
                return (
                  <li key={document.id} className={`rounded-lg border bg-card p-4 ${isProblem ? "border-warning/40" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {document.status === "VERIFIED" ? (
                          <BadgeCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                        ) : isProblem ? (
                          <FileWarning className="size-4 shrink-0 text-warning" aria-hidden="true" />
                        ) : (
                          <CircleAlert className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                        <p className="truncate text-sm font-semibold">{document.fileName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {document.confidence !== null && (
                          <span className="text-xs text-muted-foreground">{t("verification.confidence")}: {Math.round(document.confidence * 100)}%</span>
                        )}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateClass}`}>
                          {t(`verification.documentStatus.${document.status ?? "NEEDS_REVIEW"}` as TranslationKey)}
                        </span>
                      </div>
                    </div>
                    {document.notes && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">{t("aiReview.aiNotesLabel")}:</span> {document.notes}</p>
                    )}
                    {document.inconsistencies.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {document.inconsistencies.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-destructive">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* AI-assisted requirement evaluations with evidence */}
        {aiRequirements.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">{t("aiReview.requirementsHeading")}</h3>
            <ul className="mt-2 space-y-3">
              {aiRequirements.map((requirement) => (
                <li key={requirement.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{requirement.requirementName}</p>
                    <div className="flex items-center gap-2">
                      {requirement.confidence !== null && <span className="text-xs text-muted-foreground">{t("verification.confidence")}: {Math.round(requirement.confidence * 100)}%</span>}
                      <Badge variant={requirement.result === "PASS" ? "success" : requirement.result === "FAIL" ? "destructive" : "warning"}>
                        {t(`verification.result.${requirement.result}` as TranslationKey)}
                      </Badge>
                    </div>
                  </div>
                  {requirement.explanation && <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{requirement.explanation}</p>}
                  {requirement.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1 rounded-md bg-secondary/40 p-2.5">
                      {requirement.evidence.map((item, index) => (
                        <li key={index} className="text-xs text-secondary-foreground">
                          <span className="font-semibold">{item.source === "DOCUMENT" ? t("verification.evidenceDocument") : t("verification.evidenceApplication")}:</span> {item.quote}
                          {item.value ? ` — ${item.value}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t("aiReview.disclaimer")}</p>
      </div>
    </section>
  );
}
