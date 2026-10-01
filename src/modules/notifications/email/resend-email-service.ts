import "server-only";
import { logger } from "@/lib/logging/logger";
import { createResendClient } from "@/lib/resend/client";
import { renderEmailHtml, renderEmailText } from "./email-html";
import type { RenderedEmail } from "./email-types";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "Komunalni grantovi <notifications@resend.dev>";

export interface SentEmailResult {
  delivered: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
}

/**
 * Sends one rendered email through Resend.
 *
 * Server-only: the Resend client and its API key never leave this module.
 * Failures are returned (not thrown) so a delivery problem never breaks the
 * grant/application workflow that triggered the notification.
 */
export async function sendRenderedEmail(recipientEmail: string, email: RenderedEmail): Promise<SentEmailResult> {
  try {
    const resend = createResendClient();
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [recipientEmail],
      subject: email.subject,
      html: renderEmailHtml(email),
      text: renderEmailText(email),
    });
    if (error) {
      logger.warn("email_send_rejected", { subject_kind: email.heading.slice(0, 60) });
      return { delivered: false, providerMessageId: null, errorMessage: error.message.slice(0, 300) };
    }
    return { delivered: true, providerMessageId: data?.id ?? null, errorMessage: null };
  } catch (error) {
    logger.warn("email_send_failed", { message: error instanceof Error ? error.message.slice(0, 200) : "unknown" });
    return { delivered: false, providerMessageId: null, errorMessage: error instanceof Error ? error.message.slice(0, 300) : "unknown error" };
  }
}
