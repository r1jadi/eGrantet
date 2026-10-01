"use client";

import { CheckCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "../actions/notification-actions";

/** Marks every unread notification read and refreshes the inbox. */
export function MarkAllReadButton({ label }: { label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending || done}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsReadAction();
          setDone(true);
          router.refresh();
        })
      }
    >
      {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
      {label}
    </Button>
  );
}
