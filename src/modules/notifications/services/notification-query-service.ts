import "server-only";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  applicationId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** The signed-in user's notifications, newest first (RLS mirrors this filter). */
export async function listNotificationsForCurrentUser(limit = 30): Promise<NotificationItem[]> {
  const user = await requireAuth();
  const { data, error } = await createSupabaseAdminClient()
    .from("notifications")
    .select("id, type, title, message, application_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new AppError("DATABASE", "Unable to load your notifications.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    message: String(row.message),
    applicationId: (row.application_id as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}

/** Deletes the signed-in user's read notifications (inbox maintenance). */
export async function deleteReadNotificationsForCurrentUser(): Promise<number> {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("notifications")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .not("read_at", "is", null);
  if (error) throw new AppError("DATABASE", "Unable to clear your notifications.", error);
  return count ?? 0;
}

/** Deletes one of the signed-in user's notifications by id. */
export async function deleteNotificationForCurrentUser(notificationId: string): Promise<void> {
  const user = await requireAuth();
  const { error, count } = await createSupabaseAdminClient()
    .from("notifications")
    .delete({ count: "exact" })
    .eq("id", notificationId)
    .eq("user_id", user.id);
  if (error) throw new AppError("DATABASE", "Unable to remove the notification.", error);
  if (!count) throw new AppError("NOT_FOUND", "Notification not found.");
}

export async function countUnreadNotifications(): Promise<number> {
  const user = await requireAuth();
  const { count, error } = await createSupabaseAdminClient()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) throw new AppError("DATABASE", "Unable to count unread notifications.", error);
  return count ?? 0;
}

/** Marks notifications read; without ids, marks all of the user's unread rows. */
export async function markNotificationsRead(notificationIds?: string[]): Promise<number> {
  const user = await requireAuth();
  let request = createSupabaseAdminClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (notificationIds && notificationIds.length > 0) request = request.in("id", notificationIds);
  const { data, error } = await request.select("id");
  if (error) throw new AppError("DATABASE", "Unable to mark notifications as read.", error);
  return data?.length ?? 0;
}
