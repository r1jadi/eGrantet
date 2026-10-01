"use client";

import Link from "next/link";
import { CheckCircle2, CircleX, ClipboardCheck, FileStack, Hourglass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n";
import type { MunicipalApplicationStats } from "../types";

const cardConfig: Array<{ key: keyof MunicipalApplicationStats; labelKey: TranslationKey; icon: typeof FileStack }> = [
  { key: "total", labelKey: "municipality.statsTotal", icon: FileStack },
  { key: "readyForReview", labelKey: "municipality.statsReadyForReview", icon: ClipboardCheck },
  { key: "inReview", labelKey: "municipality.statsInReview", icon: Hourglass },
  { key: "approved", labelKey: "municipality.statsApproved", icon: CheckCircle2 },
  { key: "rejected", labelKey: "municipality.statsRejected", icon: CircleX },
];

export function MunicipalStatCards({ stats }: { stats: MunicipalApplicationStats }) {
  const t = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cardConfig.map(({ key, labelKey, icon: Icon }) => (
        <Card key={key} className="transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight">{stats[key]}</p>
              <p className="truncate text-sm text-muted-foreground">
                {key === "total" ? t(labelKey) : <Link href="/municipality/applications" className="hover:text-foreground hover:underline">{t(labelKey)}</Link>}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
