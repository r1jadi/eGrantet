import assert from "node:assert/strict";
import test from "node:test";
import {
  __clearRateLimitBucketsForTests,
  checkRateLimit,
  enforceRateLimit,
} from "./rate-limit-store";
import { AppError } from "@/lib/errors/app-error";

test("first attempts within the limit are allowed", () => {
  __clearRateLimitBucketsForTests();
  const options = { key: "test:basic", limit: 3, windowMs: 60_000 };
  assert.equal(checkRateLimit(options, 1_000).allowed, true);
  assert.equal(checkRateLimit(options, 2_000).allowed, true);
  assert.equal(checkRateLimit(options, 3_000).allowed, true);
});

test("attempts beyond the limit are rejected until the window resets", () => {
  __clearRateLimitBucketsForTests();
  const options = { key: "test:exhaust", limit: 2, windowMs: 60_000 };
  checkRateLimit(options, 1_000);
  checkRateLimit(options, 2_000);
  const rejected = checkRateLimit(options, 3_000);
  assert.equal(rejected.allowed, false);
  assert.ok(rejected.retryAfterMs > 0);
  // After the window, the bucket resets.
  assert.equal(checkRateLimit(options, 61_001).allowed, true);
});

test("different keys have independent budgets", () => {
  __clearRateLimitBucketsForTests();
  checkRateLimit({ key: "test:a", limit: 1, windowMs: 60_000 }, 1_000);
  assert.equal(checkRateLimit({ key: "test:a", limit: 1, windowMs: 60_000 }, 2_000).allowed, false);
  assert.equal(checkRateLimit({ key: "test:b", limit: 1, windowMs: 60_000 }, 2_000).allowed, true);
});

test("enforceRateLimit throws a safe user-facing error", () => {
  __clearRateLimitBucketsForTests();
  const options = { key: "test:enforce", limit: 1, windowMs: 60_000 };
  enforceRateLimit(options, 1_000);
  assert.throws(() => enforceRateLimit(options, 2_000), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal((error as AppError).code, "VALIDATION");
    // No internals leak into the message.
    assert.ok(!(error as Error).message.includes("test:enforce"));
    return true;
  });
});
