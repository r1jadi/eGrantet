/**
 * Canonical public base URL. `NEXT_PUBLIC_SITE_URL` is the documented
 * variable (see `.env.example`); the legacy `NEXT_PUBLIC_APP_URL` is still
 * honored as a fallback so existing deployments keep working.
 */
function resolveAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol");
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

const appUrl = resolveAppUrl();

/** Base URL used to build links inside emails and other server-generated content. */
export function getAppUrl(): string {
  return appUrl;
}

export const emailVerificationRedirect = `${appUrl}/auth/verified`;
export const passwordResetRedirect = `${appUrl}/reset-password`;
