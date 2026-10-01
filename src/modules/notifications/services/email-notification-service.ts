import "server-only";
import { randomUUID } from "node:crypto";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
import { getAppUrl } from "@/lib/auth/env";
import type { Locale } from "@/lib/i18n";
import { createNotification } from "./notification-service";
import { buildDedupKey, resolveEmailLocale, shouldSendEmailForCategory, type NotificationCategory } from "./email-pipeline-rules";
import { renderEmailTemplate, type EmailTemplateKind, type EvaluationEmailVariables, type ApplicationEmailVariables, type GrantEmailVariables, type MilestoneEmailVariables, type VerificationEmailVariables } from "../email/email-types";
import { sendRenderedEmail } from "../email/resend-email-service";

/**
 * Unified notification pipeline.
 *
 * One domain event → preference gate → in-app notification + email, sharing a
 * single deterministic dedup key so reprocessing never duplicates an email.
 * The recipient is ALWAYS the authoritative account email read server-side
 * from auth (never client input). Email failure never breaks the caller.
 */

export type { NotificationCategory } from "./email-pipeline-rules";
export { ALWAYS_SEND_CATEGORIES, NOTIFICATION_CATEGORIES } from "./email-pipeline-rules";

export interface NotificationPreferences {
  grant_announcements: boolean;
  recommended_grants: boolean;
  application_updates: boolean;
  document_updates: boolean;
  verification_updates: boolean;
  evaluation_updates: boolean;
  decision_notifications: boolean;
  milestone_updates: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  grant_announcements: true,
  recommended_grants: true,
  application_updates: true,
  document_updates: true,
  verification_updates: true,
  evaluation_updates: true,
  decision_notifications: true,
  milestone_updates: true,
};

const preferenceColumns = Object.keys(DEFAULT_PREFERENCES) as Array<keyof NotificationPreferences>;

export interface NotifyTarget {
  userId: string;
  applicationId?: string;
  category: NotificationCategory;
  inApp: { type: "APPLICATION_STATUS" | "CORRECTION_REQUEST" | "SYSTEM" | "MILESTONE" | "GRANT_RECOMMENDATION" | "VERIFICATION" | "EVALUATION"; title: string; message: string };
  email?: {
    templateKind: EmailTemplateKind;
    /** Deterministic event identity for dedup (e.g. `grant:{id}:published`). */
    eventKey: string;
    locale?: Locale;
    variables: Partial<GrantEmailVariables & ApplicationEmailVariables & MilestoneEmailVariables & EvaluationEmailVariables & VerificationEmailVariables>;
  };
}

interface AccountRecord {
  language: string;
}

/** Reads the user's account record: language preference (server-side only). */
async function loadAccount(userId: string): Promise<AccountRecord | null> {
  const { data, error } = await createSupabaseAdminClient().from("users").select("language").eq("id", userId).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the user account.", error);
  return (data as AccountRecord | null) ?? null;
}

/** Reads the user's notification preferences, creating defaults on first touch. */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("notification_preferences").select(preferenceColumns.join(", ")).eq("user_id", userId).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load notification preferences.", error);
  if (data) return data as unknown as NotificationPreferences;
  const { data: created, error: insertError } = await admin.from("notification_preferences").insert({ user_id: userId }).select(preferenceColumns.join(", ")).single();
  if (insertError) {
    logger.warn("notification_preferences_defaults", { userId });
    return { ...DEFAULT_PREFERENCES };
  }
  return created as unknown as NotificationPreferences;
}

/** Updates the signed-in user's own notification preferences. */
export async function updateNotificationPreferences(userId: string, patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const admin = createSupabaseAdminClient();
  const update: Record<string, unknown> = {};
  for (const column of preferenceColumns) {
    if (typeof patch[column] === "boolean") update[column] = patch[column];
  }
  const { data, error } = await admin.from("notification_preferences").upsert({ user_id: userId, ...update }, { onConflict: "user_id" }).select(preferenceColumns.join(", ")).single();
  if (error) throw new AppError("DATABASE", "Unable to save notification preferences.", error);
  return data as unknown as NotificationPreferences;
}

/** Resolves the authoritative account email for a user (server-side only). */
export async function getAccountEmail(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  const email = data.user.email;
  return email.includes("@") ? email : null;
}

/** Processes one notification through prefs → in-app + email. */
export async function notifyUser(target: NotifyTarget): Promise<{ inAppCreated: boolean; emailStatus: "SENT" | "FAILED" | "SKIPPED" | "DISABLED" | "NONE" }> {
  const admin = createSupabaseAdminClient();
  const preferences = await getNotificationPreferences(target.userId);

  // In-app notification always exists for a real domain event (even when the
  // category is disabled — the inbox stays truthful; only email is gated).
  let inAppCreated = false;
  try {
    await createNotification({ userId: target.userId, applicationId: target.applicationId, type: target.inApp.type, title: target.inApp.title, message: target.inApp.message });
    inAppCreated = true;
  } catch (error) {
    logger.warn("notification_in_app_failed", { userId: target.userId, message: error instanceof Error ? error.message.slice(0, 200) : "unknown" });
  }

  if (!target.email) return { inAppCreated, emailStatus: "NONE" };

  if (!shouldSendEmailForCategory(target.category, preferences)) {
    await logEmail({ admin, userId: target.userId, notificationId: null, dedupKey: buildDedupKey(target.userId, target.email.eventKey ?? randomUUID(), target.category), category: target.category, recipientEmail: "", status: "SKIPPED" });
    return { inAppCreated, emailStatus: "DISABLED" };
  }

  const accountEmail = await getAccountEmail(target.userId);
  if (!accountEmail) {
    logger.warn("notification_email_no_recipient", { userId: target.userId });
    await logEmail({ admin, userId: target.userId, notificationId: null, dedupKey: buildDedupKey(target.userId, target.email.eventKey ?? randomUUID(), target.category), category: target.category, recipientEmail: "", status: "SKIPPED" });
    return { inAppCreated, emailStatus: "SKIPPED" };
  }

  const account = await loadAccount(target.userId);
  const locale = resolveEmailLocale(target.email.locale, account?.language);

  // Idempotency: a unique index on dedup_key makes a replayed event a no-op.
  const dedupKey = buildDedupKey(target.userId, target.email.eventKey ?? randomUUID(), target.category);
  const inserted = await claimEmailSlot({ admin, userId: target.userId, dedupKey, category: target.category, recipientEmail: accountEmail });
  if (!inserted) return { inAppCreated, emailStatus: "SKIPPED" };

  const email = renderEmailTemplate(locale, target.email.templateKind, {
    locale,
    grant: target.email.variables as GrantEmailVariables | undefined,
    application: target.email.variables as ApplicationEmailVariables | undefined,
    milestone: target.email.variables as MilestoneEmailVariables | undefined,
    evaluation: target.email.variables as EvaluationEmailVariables | undefined,
    verification: target.email.variables as VerificationEmailVariables | undefined,
  });

  const result = await sendRenderedEmail(accountEmail, email);
  const status = result.delivered ? "SENT" : "FAILED";
  await admin
    .from("notification_emails")
    .update({ status, provider_message_id: result.providerMessageId, error_message: result.errorMessage, sent_at: result.delivered ? new Date().toISOString() : null, notification_id: inserted.notificationId })
    .eq("id", inserted.rowId);

  return { inAppCreated, emailStatus: status };
}

interface ClaimedSlot {
  rowId: string;
  notificationId: string | null;
}

/** Atomically claims the dedup slot; returns null when the email was already sent. */
async function claimEmailSlot(input: { admin: ReturnType<typeof createSupabaseAdminClient>; userId: string; dedupKey: string; category: string; recipientEmail: string }): Promise<ClaimedSlot | null> {
  const { data, error } = await input.admin
    .from("notification_emails")
    .insert({ user_id: input.userId, dedup_key: input.dedupKey, email_category: input.category, recipient_email: input.recipientEmail, status: "PENDING" })
    .select("id, notification_id")
    .single();
  if (error) {
    // Unique violation → already processed for this event.
    if ((error as { code?: string }).code === "23505") return null;
    logger.warn("notification_email_claim_failed", { userId: input.userId, message: error.message.slice(0, 200) });
    return null;
  }
  return { rowId: String(data.id), notificationId: (data.notification_id as string | null) ?? null };
}

async function logEmail(input: { admin: ReturnType<typeof createSupabaseAdminClient>; userId: string; notificationId: string | null; dedupKey: string; category: string; recipientEmail: string; status: string }): Promise<void> {
  const { error } = await input.admin.from("notification_emails").insert({
    user_id: input.userId,
    notification_id: input.notificationId,
    dedup_key: input.dedupKey,
    email_category: input.category,
    recipient_email: input.recipientEmail || "unknown@skipped.invalid",
    status: input.status,
  });
  if (error) logger.warn("notification_email_log_failed", { userId: input.userId, status: input.status });
}

/** Link builder rooted at the configurable app URL (never hardcoded localhost in templates). */
export function applicationUrl(applicationId: string): string {
  return `${getAppUrl()}/applications/${applicationId}`;
}

export function grantUrl(grantId: string): string {
  return `${getAppUrl()}/grants/${grantId}`;
}

export function evaluatorApplicationUrl(applicationId: string): string {
  return `${getAppUrl()}/evaluator/applications/${applicationId}`;
}

/** Recipient-authorization guard for any future user-triggered send. */
export async function assertCanNotifySelf(userId: string): Promise<void> {
  const user = await requireAuth();
  if (user.id !== userId) throw new AppError("AUTHORIZATION", "You cannot manage notifications for another user.");
}
