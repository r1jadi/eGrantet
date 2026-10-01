"use client";

import { FileCheck, FilePlus2, FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useActionState, useState, type ChangeEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/shared/page-states";
import { SectionHeading } from "@/modules/grants/components/municipality-sections";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatDate } from "@/lib/i18n/format";
import {
  deleteBusinessDocumentAction,
  uploadBusinessDocumentAction,
  viewBusinessDocumentAction,
  type BusinessUploadState,
} from "../actions/business-upload-actions";
import type { BusinessUploadedDocument } from "../services/business-upload-service";

const accept = ".pdf,.png,.jpg,.jpeg";
const idleState: BusinessUploadState = { status: "idle" };

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
/**
 * Documents area for My Business: ARBK registry documents (read-only, fetched
 * by the trusted NUI) and the business's own uploads with real persistence —
 * private storage, server-side validation, confirmed deletion, and signed
 * view URLs.
 */
export function MyBusinessDocuments({
  arbkDocuments,
  uploads,
}: {
  arbkDocuments: Array<{ id: string; name: string; type: string; issuedAt: string | null }>;
  uploads: BusinessUploadedDocument[];
}) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const inputId = useId();
  const [inputValue, setInputValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadState, uploadAction, isUploading] = useActionState<BusinessUploadState, FormData>(uploadBusinessDocumentAction, idleState);
  const [deleteState, deleteAction, isDeleting] = useActionState<BusinessUploadState, FormData>(deleteBusinessDocumentAction, idleState);
  const [viewError, setViewError] = useState<string | null>(null);

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    setFileName(event.target.files?.item(0)?.name ?? null);
    setInputValue(event.target.value);
  };

  const openDocument = (documentId: string) => {
    setViewError(null);
    viewBusinessDocumentAction(documentId)
      .then((url) => window.open(url, "_blank", "noopener"))
      .catch((error: unknown) => setViewError(error instanceof Error ? error.message : t("business.viewError")));
  };

  return (
    <div className="mt-8 space-y-6">
      <section aria-labelledby="arbk-documents-heading">
        <SectionHeading icon={FileCheck} title={t("business.arbkDocumentsTitle")} description={t("business.arbkDocumentsDescription")} />
        <span id="arbk-documents-heading" className="sr-only">{t("business.arbkDocumentsTitle")}</span>
        {arbkDocuments.length === 0 ? (
          <div className="mt-4"><EmptyState title={t("business.noArbkDocuments")} description={t("business.noArbkDocumentsDescription")} /></div>
        ) : (
          <ul className="mt-4 space-y-3">
            {arbkDocuments.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><FileText className="size-4" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{document.name}</p>
                    <p className="text-xs text-muted-foreground">{document.type}{document.issuedAt ? ` · ${t("business.issuedOn", { date: formatDate(locale, document.issuedAt) })}` : ""}</p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{t("business.fromArbkBadge")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-documents-heading">
        <SectionHeading icon={FilePlus2} title={t("business.myUploadsTitle")} description={t("business.myUploadsDescription")} />
        <span id="my-documents-heading" className="sr-only">{t("business.myUploadsTitle")}</span>
        <div className="mt-4 rounded-xl border bg-card p-4 sm:p-5">
          {uploadState.status !== "idle" && uploadState.message && (
            <Alert
              className={`mb-3 ${uploadState.status === "error" ? "border-destructive/30 bg-destructive-background text-destructive" : "border-success/30 bg-success-background text-success"}`}
              role={uploadState.status === "error" ? "alert" : undefined}
            >
              <p className="font-semibold">{uploadState.message}</p>
            </Alert>
          )}
          {deleteState.status === "error" && deleteState.message && (
            <Alert className="mb-3 border-destructive/30 bg-destructive-background text-destructive" role="alert">
              <p className="font-semibold">{deleteState.message}</p>
            </Alert>
          )}
          {viewError && (
            <Alert className="mb-3 border-destructive/30 bg-destructive-background text-destructive" role="alert">
              <p className="font-semibold">{viewError}</p>
            </Alert>
          )}
          <form action={uploadAction} className="rounded-lg border border-dashed p-5 text-center">
            <Upload className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">{fileName ?? t("business.addDocumentPlaceholder")}</p>
            <div className="mx-auto mt-3 flex max-w-sm flex-col gap-2 sm:flex-row">
              <Input id={inputId} type="file" name="file" accept={accept} value={inputValue} onChange={onFileSelected} required className="text-sm" />
              <Button type="submit" disabled={!fileName || isUploading} className="shrink-0">
                {isUploading ? <><LoaderCircle className="size-4 animate-spin" />{t("business.adding")}</> : <>{t("business.addDocument")}</>}
              </Button>
            </div>
          </form>
          {uploads.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">{t("business.noUploadsYet")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {uploads.map((upload) => (
                <li key={upload.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><FileText className="size-4" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{upload.fileName}</p>
                      <p className="text-xs text-muted-foreground">{upload.documentType} · {formatSize(upload.fileSizeBytes)} · {t("business.uploadedOn", { date: formatDate(locale, upload.createdAt) })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openDocument(upload.id)}>
                      {t("common.view")}
                    </Button>
                    <ConfirmActionDialog
                      trigger={
                        <Button type="button" variant="outline" size="sm">
                          <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                          <span className="sr-only">{t("adminUi.deleteSr", { name: upload.fileName })}</span>
                        </Button>
                      }
                      title={t("business.deleteTitle", { name: upload.fileName })}
                      description={t("business.deleteDescription")}
                      confirmLabel={t("business.deleteConfirm")}
                      cancelLabel={t("common.cancel")}
                      action={async () => {
                        const formData = new FormData();
                        formData.set("documentId", upload.id);
                        await deleteAction(formData);
                        router.refresh();
                        return t("business.deleteSuccess");
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
