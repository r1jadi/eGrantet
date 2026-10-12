import "server-only";
import { headers } from "next/headers";

export { checkRateLimit, enforceRateLimit, __clearRateLimitBucketsForTests, type RateLimitOptions } from "./rate-limit-store";

/**
 * Best-effort client identifier from proxy-forwarded headers (Vercel sets
 * `x-forwarded-for`). Falls back to "unknown" — callers should scope keys
 * with a user id where one is available.
 */
export async function getClientIp(): Promise<string> {
  try {
    const store = await headers();
    const forwarded = store.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
    const real = store.get("x-real-ip")?.trim();
    if (real) return real.slice(0, 64);
  } catch {
    /* headers() unavailable (tests/edge): fall through */
  }
  return "unknown";
}
