"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Notification bell with a live unread badge. The count is polled from the
 * real notifications service through a lightweight server action; errors are
 * swallowed (a failed count must never break the header).
 */
export function NotificationsBell({ initialCount = 0, label }: { initialCount?: number; label: string }) {
  const [unread, setUnread] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const { countUnreadNotificationsAction } = await import("../actions/notification-actions");
        const count = await countUnreadNotificationsAction();
        if (!cancelled) setUnread(count);
      } catch {
        // Unauthenticated or transient failure: keep the previous count.
      }
    };
    const timer = setInterval(refresh, 60_000);
    void refresh();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted"
      aria-describedby={unread > 0 ? "notifications-unread-badge" : undefined}
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          id="notifications-unread-badge"
          className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
        >
          {unread > 9 ? "9+" : unread}
          <span className="sr-only"> unread notifications</span>
        </span>
      )}
    </Link>
  );
}
