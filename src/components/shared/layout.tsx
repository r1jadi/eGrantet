import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) { return <div className={cn("mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-9 lg:py-8", className)}>{children}</div>; }
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) { return <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}</header>; }
export function Section({ title, description, children, className }: { title?: string; description?: string; children: ReactNode; className?: string }) { return <section className={cn("space-y-4", className)}>{title && <div><h2 className="text-lg font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>}{children}</section>; }
export function ContentGrid({ children, className }: { children: ReactNode; className?: string }) { return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>; }
