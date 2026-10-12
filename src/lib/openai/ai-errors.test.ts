import assert from "node:assert/strict";
import test from "node:test";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  RateLimitError,
} from "openai";
import { AppError } from "@/lib/errors/app-error";
import { classifyAiFailure, sanitizeAiErrorMessage, toAiServiceError } from "./ai-errors";

/** A non-SDK error carrying a real provider message body (as gateways sometimes surface). */
class HttpLikeError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HTTPError";
  }
}

test("authentication failures classify as credential problems without provider details", () => {
  const result = classifyAiFailure(new AuthenticationError(401, "invalid api key", undefined, new Headers()));
  assert.equal(result.logKind, "ai_request_unauthorized");
  assert.match(result.userMessage, /credentials/);
  assert.doesNotMatch(result.userMessage, /invalid api key|llm\.|http/i);
});

test("missing key (plain config error) classifies as generic unavailability", () => {
  const result = classifyAiFailure(new Error("AI_API_KEY is not configured."));
  assert.equal(result.logKind, "ai_request_failed");
  assert.equal(result.userMessage, "The AI service is unavailable. Please try again.");
});

test("not-found failures classify as a model availability problem", () => {
  const result = classifyAiFailure(new NotFoundError(404, 'The model "openai/gpt-oss-20b" does not exist', undefined, new Headers()));
  assert.equal(result.logKind, "ai_request_model_not_found");
  assert.match(result.userMessage, /model is not available/);
  assert.doesNotMatch(result.userMessage, /gpt-oss-20b/);
});

test("rate limit and budget exhaustion classifies as rate limited", () => {
  const result = classifyAiFailure(new RateLimitError(429, "insufficient quota: budget exhausted", undefined, new Headers()));
  assert.equal(result.logKind, "ai_request_rate_limited");
  assert.match(result.userMessage, /rate limited/);
  assert.doesNotMatch(result.userMessage, /quota|budget/i);
});

test("connection and timeout failures classify as reachability problems", () => {
  const timeout = classifyAiFailure(new APIConnectionTimeoutError({}));
  assert.equal(timeout.logKind, "ai_request_timeout");
  assert.match(timeout.userMessage, /took too long/);

  const connection = classifyAiFailure(new APIConnectionError({ message: "fetch failed" }));
  assert.equal(connection.logKind, "ai_request_connection_error");
  assert.match(connection.userMessage, /could not be reached/);
  assert.doesNotMatch(connection.userMessage, /fetch failed/);
});

test("bad request and provider errors classify as transient unavailability", () => {
  const badRequest = classifyAiFailure(new BadRequestError(400, "unknown parameter", undefined, new Headers()));
  assert.equal(badRequest.logKind, "ai_request_bad_request");
  assert.match(badRequest.userMessage, /rejected the request/);

  const internal = classifyAiFailure(new InternalServerError(503, "upstream unavailable", undefined, new Headers()));
  assert.equal(internal.logKind, "ai_request_provider_error");
  assert.match(internal.userMessage, /temporarily unavailable/);
});

test("unknown plain errors classify as generic unavailability", () => {
  const result = classifyAiFailure(new HttpLikeError(500, "unexpected gateway crash with secret=abc"));
  assert.equal(result.logKind, "ai_request_failed");
  assert.equal(result.userMessage, "The AI service is unavailable. Please try again.");
  assert.doesNotMatch(result.userMessage, /secret/);
});

test("AppError inputs pass through unchanged", () => {
  const original = new AppError("AI", "A safe, prepared message.");
  assert.equal(toAiServiceError(original), original);
});

test("toAiServiceError wraps provider errors in an AppError with the safe message", () => {
  const wrapped = toAiServiceError(new AuthenticationError(401, "invalid api key", undefined, new Headers()));
  assert.ok(wrapped instanceof AppError);
  assert.equal(wrapped.code, "AI");
  assert.match(wrapped.message, /credentials/);
  assert.doesNotMatch(wrapped.message, /invalid api key/);
});

test("sanitizeAiErrorMessage redacts key-like material in log strings", () => {
  const sanitized = sanitizeAiErrorMessage(new Error("Authorization: Bearer sk-team-secret-123 failed for key=sk-team-secret-123"));
  assert.doesNotMatch(sanitized, /sk-team-secret-123/);
  assert.match(sanitized, /\[redacted\]/);
  assert.ok(sanitized.length <= 200);
});
