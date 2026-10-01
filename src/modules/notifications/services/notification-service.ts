import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors/app-error";
export type NotificationType = "APPLICATION_STATUS" | "CORRECTION_REQUEST" | "SYSTEM" | "MILESTONE" | "GRANT_RECOMMENDATION" | "VERIFICATION" | "EVALUATION";

export async function createNotification(input: { userId: string; applicationId?: string; type: NotificationType; title: string; message: string }) { const { data, error } = await createSupabaseAdminClient().from("notifications").insert({ user_id: input.userId, application_id: input.applicationId ?? null, type: input.type, title: input.title, message: input.message }).select().single(); if (error) throw new AppError("DATABASE", "Unable to create notification.", error); return data; }
