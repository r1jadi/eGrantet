"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
export type RequirementState = "REQUIRED" | "OPTIONAL" | "COMPLETED" | "MISSING" | "FAILED" | "PASSED";
const config: Record<RequirementState, { key: TranslationKey; variant: NonNullable<BadgeProps["variant"]> }> = {
  REQUIRED: { key: "statusLabels.requirement.REQUIRED", variant: "default" }, OPTIONAL: { key: "statusLabels.requirement.OPTIONAL", variant: "outline" }, COMPLETED: { key: "statusLabels.requirement.COMPLETED", variant: "success" },
  MISSING: { key: "statusLabels.requirement.MISSING", variant: "warning" }, FAILED: { key: "statusLabels.requirement.FAILED", variant: "destructive" }, PASSED: { key: "statusLabels.requirement.PASSED", variant: "success" },
};
export function RequirementStatus({ status }: { status: RequirementState }) { const item = config[status]; const t = useT(); return <Badge variant={item.variant}>{t(item.key)}</Badge>; }
