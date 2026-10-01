import { cn } from "@/lib/utils/cn";
export function Progress({ value, className }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return <div aria-label="Progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={safeValue} role="progressbar" className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${safeValue}%` }} /></div>;
}
