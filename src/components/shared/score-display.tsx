"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/client";

export function ScoreDisplay({ score, maximumScore, label, className }: { score: number; maximumScore: number; label?: string; className?: string }) {
  const percentage = maximumScore > 0 ? (score / maximumScore) * 100 : 0;
  const t = useT();
  return <div className={cn("space-y-2", className)}><div className="flex justify-between gap-4 text-sm"><span className="font-medium">{label ?? t("common.score")}</span><span className="text-muted-foreground">{score} / {maximumScore}</span></div><Progress value={percentage} /></div>;
}
