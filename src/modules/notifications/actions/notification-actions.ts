"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { countUnreadNotifications, deleteNotificationForCurrentUser, deleteReadNotificationsForCurrentUser, markNotificationsRead } from "../services/notification-query-service";

const idsSchema = z.array(z.uuid()).max(100).optional();

/** Unread count for the signed-in user (bell badge). */
export async function countUnreadNotificationsAction(): Promise<number> {
  try {
    return await countUnreadNotifications();
  } catch {
    // The bell must degrade silently when signed out.
    return 0;
  }
}

/** Marks the user's unread notifications read (all, or only the given ids). */
export async function markNotificationsReadAction(rawIds?: unknown): Promise<{ marked: number }> {
  const ids = rawIds === undefined ? undefined : idsSchema.parse(rawIds);
  const marked = await markNotificationsRead(ids);
  revalidatePath("/notifications");
  return { marked };
}

/** Clears every read notification from the signed-in user's inbox. */
export async function clearReadNotificationsAction(): Promise<{ cleared: number }> {
  const cleared = await deleteReadNotificationsForCurrentUser();
  revalidatePath("/notifications");
  return { cleared };
}

/** Removes one of the signed-in user's notifications (dismiss). */
export async function dismissNotificationAction(notificationId: string): Promise<void> {
  const id = z.uuid().parse(notificationId);
  await deleteNotificationForCurrentUser(id);
  revalidatePath("/notifications");
}
