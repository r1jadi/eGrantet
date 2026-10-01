import { Alert } from "@/components/ui/alert";

/** Inline error banner for action failures; messages are pre-sanitized server-side. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Alert role="alert" className="border-destructive/30 bg-destructive-background text-destructive">{message}</Alert>;
}
