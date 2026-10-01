"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
export type DocumentState = "UPLOADED" | "PROCESSING" | "VERIFIED" | "FLAGGED" | "REJECTED";
const config: Record<DocumentState, { key: TranslationKey; variant: NonNullable<BadgeProps["variant"]> }> = {
  UPLOADED: { key: "statusLabels.document.UPLOADED", variant: "default" }, PROCESSING: { key: "statusLabels.document.PROCESSING", variant: "warning" }, VERIFIED: { key: "statusLabels.document.VERIFIED", variant: "success" },
  FLAGGED: { key: "statusLabels.document.FLAGGED", variant: "warning" }, REJECTED: { key: "statusLabels.document.REJECTED", variant: "destructive" },
};
export function DocumentStatus({ status }: { status: DocumentState }) { const item = config[status]; const t = useT(); return <Badge variant={item.variant}>{t(item.key)}</Badge>; }
