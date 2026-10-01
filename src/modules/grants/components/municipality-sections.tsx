import Link from "next/link";
import type { ReactNode } from "react";

/** Server-safe stat card: plain props only, so it can render in Server Components. */
export function StatCard({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const content = <><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</>;
  if (href) return <Link href={href} className="block rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">{content}</Link>;
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{content}</div>;
}

/**
 * Server-safe section heading. The optional `icon` prop receives a Lucide
 * icon component and must only be passed from Server Components (this file
 * deliberately has no "use client" directive).
 */
export function SectionHeading({ icon: Icon, title, description, action }: { icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>; title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
    <div className="flex items-start gap-3">{Icon && <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-5" aria-hidden="true" /></span>}<div><h2 className="text-lg font-bold tracking-tight">{title}</h2>{description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}</div></div>
    {action}
  </div>;
}
