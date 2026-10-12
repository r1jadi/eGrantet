import { AppError } from "@/lib/errors/app-error";

/**
 * Pure in-memory sliding-window rate-limit store.
 *
 * DOM- and server-free so it can be unit tested under plain Node. The
 * server-only wrapper in `./rate-limit` adds client identification from
 * request headers. Best-effort per instance: on serverless hosting each
 * instance keeps its own counters, so limits are approximate — they raise
 * the cost of abuse rather than providing exact global quotas.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export interface RateLimitOptions {
  /** Fully-scoped key, e.g. `auth:signin:1.2.3.4`. */
  key: string;
  /** Maximum attempts within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions, now = Date.now()): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    prune(now);
    return { allowed: true, retryAfterMs: 0 };
  }
  if (existing.count < limit) {
    existing.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
}

/** Throws a safe, user-facing error when the limit is exceeded. */
export function enforceRateLimit(options: RateLimitOptions, now = Date.now()): void {
  const result = checkRateLimit(options, now);
  if (!result.allowed) {
    throw new AppError("VALIDATION", "Too many attempts. Please wait a moment and try again.");
  }
}

function prune(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS) break;
  }
}

/** Test/introspection helper: clears all in-memory counters. */
export function __clearRateLimitBucketsForTests(): void {
  buckets.clear();
}
