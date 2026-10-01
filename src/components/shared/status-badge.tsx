"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";

/** Application statuses, matching the database `application_status` enum. */
export type ApplicationStatusName = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "CORRECTION_REQUESTED" | "APPROVED" | "REJECTED" | "WITHDRAWN";

/** Grant lifecycle statuses, matching the database `grant_status` enum. */
export type GrantStatusName = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

const statusConfig: Record<ApplicationStatusName, { key: TranslationKey; variant: NonNullable<BadgeProps["variant"]> }> = {
  DRAFT: { key: "statusLabels.application.DRAFT", variant: "outline" },
  SUBMITTED: { key: "statusLabels.application.SUBMITTED", variant: "default" },
  UNDER_REVIEW: { key: "statusLabels.application.UNDER_REVIEW", variant: "warning" },
  CORRECTION_REQUESTED: { key: "statusLabels.application.CORRECTION_REQUESTED", variant: "warning" },
  APPROVED: { key: "statusLabels.application.APPROVED", variant: "success" },
  REJECTED: { key: "statusLabels.application.REJECTED", variant: "destructive" },
  WITHDRAWN: { key: "statusLabels.application.WITHDRAWN", variant: "outline" },
};

const grantStatusConfig: Record<GrantStatusName, { key: TranslationKey; variant: NonNullable<BadgeProps["variant"]> }> = {
  DRAFT: { key: "statusLabels.grant.DRAFT", variant: "outline" },
  PUBLISHED: { key: "statusLabels.grant.PUBLISHED", variant: "success" },
  CLOSED: { key: "statusLabels.grant.CLOSED", variant: "default" },
  ARCHIVED: { key: "statusLabels.grant.ARCHIVED", variant: "outline" },
};

export function StatusBadge({ status }: { status: ApplicationStatusName }) {
  const config = statusConfig[status];
  const t = useT();
  return <Badge variant={config.variant}>{t(config.key)}</Badge>;
}

export function GrantStatusBadge({ status }: { status: GrantStatusName }) {
  const config = grantStatusConfig[status];
  const t = useT();
  return <Badge variant={config.variant}>{t(config.key)}</Badge>;
}
