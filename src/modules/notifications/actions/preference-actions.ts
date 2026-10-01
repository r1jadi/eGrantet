"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { requireAuth } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getNotificationPreferences, updateNotificationPreferences, assertCanNotifySelf, type NotificationPreferences } from "../services/email-notification-service";

const preferencesSchema = z.object({
  grant_announcements: z.boolean().optional(),
  recommended_grants: z.boolean().optional(),
  application_updates: z.boolean().optional(),
  document_updates: z.boolean().optional(),
  verification_updates: z.boolean().optional(),
  evaluation_updates: z.boolean().optional(),
  decision_notifications: z.boolean().optional(),
  milestone_updates: z.boolean().optional(),
});

export interface PreferenceState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Saves the signed-in user's own notification preferences. */
export async function saveNotificationPreferencesAction(_previous: PreferenceState, formData: FormData): Promise<PreferenceState> {
  try {
    const user = await requireAuth();
    // Authorization: a user can only ever modify their own row; the userId
    // never comes from the client.
    await assertCanNotifySelf(user.id);
    const patch = preferencesSchema.parse({
      grant_announcements: formData.get("grant_announcements") === "on",
      recommended_grants: formData.get("recommended_grants") === "on",
      application_updates: formData.get("application_updates") === "on",
      document_updates: formData.get("document_updates") === "on",
      verification_updates: formData.get("verification_updates") === "on",
      evaluation_updates: formData.get("evaluation_updates") === "on",
      // Decision notifications are always delivered (part of the official
      // process); the locked checkbox is disabled so it never submits "on" —
      // the server pins it true rather than trusting the form.
      decision_notifications: true,
      milestone_updates: formData.get("milestone_updates") === "on",
    });
    await updateNotificationPreferences(user.id, patch as Partial<NotificationPreferences>);
    revalidatePath("/settings/notifications");
    return { status: "success", message: "Preferences saved." };
  } catch (error) {
    if (error instanceof z.ZodError) return { status: "error", message: error.issues[0]?.message ?? "Invalid preferences." };
    if (error instanceof AppError) return { status: "error", message: error.message };
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

const languageSchema = z.enum(["sq", "en", "sr"]);

/** Persists the signed-in user's language choice (drives future in-app + email language). */
export async function saveLanguagePreferenceAction(locale: string): Promise<PreferenceState> {
  try {
    const user = await requireAuth();
    const parsed = languageSchema.parse(locale);
    await assertCanNotifySelf(user.id);
    const { error } = await createSupabaseAdminClient().from("users").update({ language: parsed }).eq("id", user.id);
    if (error) throw new AppError("DATABASE", "Unable to save the language preference.", error);
    revalidatePath("/settings/notifications");
    return { status: "success", message: "Language saved." };
  } catch (error) {
    if (error instanceof AppError) return { status: "error", message: error.message };
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Server loader for the settings page (no client-reachable userId). */
export async function loadNotificationPreferencesAction(): Promise<{ preferences: NotificationPreferences; language: string }> {
  const user = await requireAuth();
  const preferences = await getNotificationPreferences(user.id);
  const { data } = await createSupabaseAdminClient().from("users").select("language").eq("id", user.id).maybeSingle();
  return { preferences, language: (data as { language?: string } | null)?.language ?? "en" };
}
