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

/**
 * Pure AI failure classification, kept free of environment access and logging
 * so it stays unit-testable. The server-only wrapper in `config.ts` applies it
 * (and logs the sanitized details); adapters only ever surface the safe
 * user message, never raw provider errors.
 */
export interface AiFailureClassification {
  /** Safe, user-facing message. Contains no provider, key, or URL details. */
  userMessage: string;
  /** Server-side log event name for the failure class. */
  logKind: string;
}

const classifications: Array<{ matches: (error: unknown) => boolean; kind: string; message: string }> = [
  {
    matches: (error) => error instanceof APIConnectionTimeoutError,
    kind: "ai_request_timeout",
    message: "The AI service took too long to respond. Please try again.",
  },
  {
    matches: (error) => error instanceof APIConnectionError,
    kind: "ai_request_connection_error",
    message: "The AI service could not be reached. Please try again shortly.",
  },
  {
    matches: (error) => error instanceof AuthenticationError,
    kind: "ai_request_unauthorized",
    message: "The AI service rejected the configured credentials. Please contact an administrator.",
  },
  {
    matches: (error) => error instanceof RateLimitError,
    kind: "ai_request_rate_limited",
    message: "The AI service is rate limited right now. Please try again shortly.",
  },
  {
    matches: (error) => error instanceof NotFoundError,
    kind: "ai_request_model_not_found",
    message: "The configured AI model is not available. Please contact an administrator.",
  },
  {
    matches: (error) => error instanceof BadRequestError,
    kind: "ai_request_bad_request",
    message: "The AI service rejected the request. Please try again shortly.",
  },
  {
    matches: (error) => error instanceof InternalServerError,
    kind: "ai_request_provider_error",
    message: "The AI service is temporarily unavailable. Please try again shortly.",
  },
];

/** Classifies a provider/configuration failure into a safe user message + log kind. */
export function classifyAiFailure(error: unknown): AiFailureClassification {
  for (const { matches, kind, message } of classifications) {
    if (matches(error)) return { userMessage: message, logKind: kind };
  }
  return { userMessage: "The AI service is unavailable. Please try again.", logKind: "ai_request_failed" };
}

/**
 * Maps any AI provider/configuration failure to a safe `AppError("AI", ...)`.
 * `AppError`s already carry a safe user message and pass through untouched.
 */
export function toAiServiceError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const { userMessage } = classifyAiFailure(error);
  return new AppError("AI", userMessage, error);
}

/** Collapses an error to a short, key-free string for server-side logs. */
export function sanitizeAiErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key\s*[=:]\s*\S+/gi, "api_key=[redacted]")
    .slice(0, 200);
}
