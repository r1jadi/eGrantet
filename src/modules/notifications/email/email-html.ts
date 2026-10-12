import type { RenderedEmail } from "./email-types";

/**
 * Responsive HTML email renderer.
 *
 * Table-based layout (broadest client support), inline styles only, a single
 * primary CTA button, and no external assets. The palette mirrors the
 * platform's primary color scheme.
 */

const PRIMARY = "#14532d";
const TEXT = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BACKGROUND = "#f8fafc";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Renders a template result as a complete responsive HTML document. */
export function renderEmailHtml(email: RenderedEmail): string {
  const bullets = email.bullets.length
    ? `<ul style="margin:12px 0 0;padding-left:20px;color:${TEXT};font-size:14px;line-height:22px;">${email.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
    : "";
  const bodyParagraphs = email.bodyLines
    .map((line) => `<p style="margin:0 0 12px;color:${TEXT};font-size:15px;line-height:24px;">${escapeHtml(line)}</p>`)
    .join("");
  const footer = email.footerLines.map((line) => `<p style="margin:0 0 6px;color:${MUTED};font-size:12px;line-height:18px;">${escapeHtml(line)}</p>`).join("");

  return `<!DOCTYPE html>
<html lang="">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BACKGROUND};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BACKGROUND};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
  <tr><td style="background:${PRIMARY};padding:20px 24px;">
    <span style="color:#ffffff;font-size:16px;font-weight:700;">eGrantet</span>
  </td></tr>
  <tr><td style="padding:24px;">
    <h1 style="margin:0 0 16px;color:${TEXT};font-size:20px;line-height:28px;">${escapeHtml(email.heading)}</h1>
    ${bodyParagraphs}
    ${bullets}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td style="background:${PRIMARY};border-radius:8px;">
        <a href="${escapeHtml(email.ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(email.ctaLabel)}</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="border-top:1px solid ${BORDER};padding:16px 24px;">${footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Renders the plain-text fallback (accessibility + spam scoring). */
export function renderEmailText(email: RenderedEmail): string {
  const lines = [email.heading, "", ...email.bodyLines];
  if (email.bullets.length) lines.push("", ...email.bullets.map((bullet) => `• ${bullet}`));
  lines.push("", `${email.ctaLabel}: ${email.ctaUrl}`, "", ...email.footerLines);
  return lines.join("\n");
}
