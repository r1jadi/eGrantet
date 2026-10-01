"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { clearReadNotificationsAction } from "../actions/notification-actions";

/** Clears (deletes) the user's already-read notifications after confirmation. */
export function ClearReadButton({ label }: { label: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <ConfirmActionDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Trash2 className="size-4" aria-hidden="true" />
          {label}
        </Button>
      }
      title="Clear read notifications?"
      description="Every notification you have already read will be removed. Unread notifications are kept."
      confirmLabel="Clear"
      action={async () => {
        await clearReadNotificationsAction();
        router.refresh();
      }}
    />
  );
}
