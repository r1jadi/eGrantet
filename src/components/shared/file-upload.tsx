"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n/client";

export type FileUploadState = "idle" | "uploading" | "success" | "error";
export function FileUpload({ accept, disabled, fileName, fileSize, progress, state = "idle", errorMessage, onFilesSelected, onRemove }: { accept?: string; disabled?: boolean; fileName?: string; fileSize?: string; progress?: number; state?: FileUploadState; errorMessage?: string; onFilesSelected?: (files: FileList) => void; onRemove?: () => void }) {
  const inputId = useId(); const [isDragging, setIsDragging] = useState(false); const t = useT();
  const selectFiles = (files: FileList | null) => { if (files?.length) onFilesSelected?.(files); };
  return <div className="space-y-3"><div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFiles(event.dataTransfer.files); }} className={`rounded-lg border border-dashed p-6 text-center ${isDragging ? "border-primary bg-secondary" : "bg-card"}`}><input id={inputId} type="file" accept={accept} disabled={disabled} className="sr-only" onChange={(event) => selectFiles(event.target.files)} /><p className="text-sm font-medium">{t("documents.dropHere")}</p><p className="mt-1 text-xs text-muted-foreground">{t("documents.filesSelectedOnly")}</p><Button type="button" variant="outline" size="sm" className="mt-4" disabled={disabled} onClick={() => document.getElementById(inputId)?.click()}>{t("documents.browseFiles")}</Button></div>{fileName && <div className="rounded-md border bg-card p-3 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{fileName}</p>{fileSize && <p className="text-xs text-muted-foreground">{fileSize}</p>}</div>{onRemove && <Button type="button" variant="ghost" size="sm" onClick={onRemove}>{t("common.remove")}</Button>}</div>{state === "uploading" && <Progress className="mt-3" value={progress ?? 0} />}{state === "success" && <p className="mt-2 text-xs font-medium text-success">{t("documents.readyForUpload")}</p>}{state === "error" && <p className="mt-2 text-xs font-medium text-destructive" role="alert">{errorMessage ?? t("documents.fileError")}</p>}</div>}</div>;
}
