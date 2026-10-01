import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function MultiStepLayout({ steps, activeStep, children }: { steps: string[]; activeStep: number; children: ReactNode }) {
  return <div className="grid gap-8 lg:grid-cols-[13rem_1fr]"><nav aria-label="Form progress"><ol className="flex gap-3 overflow-x-auto lg:block lg:space-y-2">{steps.map((step, index) => <li key={step} className={cn("shrink-0 rounded-md px-3 py-2 text-sm", index === activeStep ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground")}>{index + 1}. {step}</li>)}</ol></nav><div>{children}</div></div>;
}
