import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export interface FormFieldA11yProps { "aria-describedby"?: string; "aria-invalid": boolean; }
export function FormField({ id, label, helperText, error, required, children }: { id: string; label: string; helperText?: string; error?: string; required?: boolean; children: ReactNode | ((props: FormFieldA11yProps) => ReactNode) }) {
  const hintId = helperText ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const content = typeof children === "function" ? children({ "aria-describedby": describedBy, "aria-invalid": Boolean(error) }) : children;
  return <div className="space-y-2"><Label htmlFor={id}>{label}{required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}</Label>{content}{helperText && <p id={hintId} className="text-xs text-muted-foreground">{helperText}</p>}{error && <p id={errorId} className="text-xs font-medium text-destructive" role="alert">{error}</p>}</div>;
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) { return <section className="space-y-5 border-b pb-8 last:border-0"><div><h2 className="text-lg font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><div className="space-y-5">{children}</div></section>; }
export function FieldGroup({ children }: { children: ReactNode }) { return <div className="grid gap-5 sm:grid-cols-2">{children}</div>; }
