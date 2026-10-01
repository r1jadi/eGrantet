const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Base URL used to build links inside emails and other server-generated content. */
export function getAppUrl(): string {
  return appUrl;
}

export const emailVerificationRedirect = `${appUrl}/auth/verified`;
export const passwordResetRedirect = `${appUrl}/reset-password`;
