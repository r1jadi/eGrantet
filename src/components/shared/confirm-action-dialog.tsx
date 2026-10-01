"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * Shared destructive-action confirmation dialog.
 *
 * Wraps any server action: the dialog opens first, and the action runs only
 * after explicit confirmation. Owns its pending state and refreshes the
 * server-rendered page after the action completes.
 */
export function ConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  action,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  action: () => Promise<string | void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setError(null);
      try {
        const message = await action();
        setNotice(typeof message === "string" ? message : null);
        setOpen(false);
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error && actionError.message ? actionError.message : "The action failed.");
      }
    });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen} title={title} description={description}>
        {error && <p className="mb-3 rounded-md border border-destructive/30 bg-destructive-background px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        {notice && <p className="mb-3 text-sm font-medium text-success">{notice}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="button" size="sm" onClick={run} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
