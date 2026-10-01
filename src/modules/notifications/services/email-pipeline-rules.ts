import { parseLocale, type Locale } from "@/lib/i18n/config";

/**
 * Pure decision rules for the unified email notification pipeline.
 *
 * Kept free of server-only imports so the security-relevant gating decisions
 * (which categories may be disabled, how dedup identity is built, which
 * locale renders the email) can be pinned by unit tests. The service layer
 * (email-notification-service.ts) applies these rules inside the real
 * Supabase/Resend flow.
 */

/** Maps a notification category to its preference column. */
export type NotificationCategory =
  | "grant_announcements"
  | "recommended_grants"
  | "application_updates"
  | "document_updates"
  | "verification_updates"
  | "evaluation_updates"
  | "decision_notifications"
  | "milestone_updates";

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  "grant_announcements",
  "recommended_grants",
  "application_updates",
  "document_updates",
  "verification_updates",
  "evaluation_updates",
  "decision_notifications",
  "milestone_updates",
];

/** Categories whose emails are transactional and ignore the opt-out. */
export const ALWAYS_SEND_CATEGORIES: ReadonlySet<NotificationCategory> = new Set(["decision_notifications"]);

/**
 * Decides whether an email may be sent for the category under the user's
 * stored preferences. Decision notifications are part of the official
 * workflow and are always delivered.
 */
export function shouldSendEmailForCategory(category: NotificationCategory, preferences: Record<NotificationCategory, boolean>): boolean {
  if (ALWAYS_SEND_CATEGORIES.has(category)) return true;
  return preferences[category] === true;
}

/**
 * Deterministic idempotency key: user + event + category. A replayed event
 * resolves to the same key, so the unique index on notification_emails
 * makes reprocessing a no-op.
 */
export function buildDedupKey(userId: string, eventKey: string, category: NotificationCategory): string {
  return `${userId}:${eventKey}:${category}`;
}

/**
 * The email locale comes from the event payload when known, otherwise from
 * the user's stored language; anything unparseable falls back to the
 * platform default — never a mixed-language send.
 */
export function resolveEmailLocale(eventLocale: string | null | undefined, accountLanguage: string | null | undefined): Locale {
  return parseLocale(eventLocale ?? accountLanguage ?? undefined);
}
