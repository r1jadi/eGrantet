"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/client";

export function LoadingState({ rows = 3 }: { rows?: number }) { const t = useT(); return <div aria-label={t("common.loadingContent")} className="space-y-3">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>; }
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) { return <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center"><h2 className="text-base font-semibold">{title}</h2>{description && <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>; }
export function ErrorState({ title, description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) { const t = useT(); return <Alert className="border-destructive/30 bg-destructive-background text-destructive"><p className="font-semibold">{title ?? t("common.errorTitle")}</p><p className="mt-1">{description ?? t("common.errorRetryMessage")}</p>{onRetry && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>{t("common.retry")}</Button>}</Alert>; }
