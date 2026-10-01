import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logging/logger";
import { classifyAiFailure, sanitizeAiErrorMessage } from "./ai-errors";

/**
 * Server-side AI provider configuration.
 *
 * The AI4Society hackathon provides an OpenAI-compatible gateway whose base
 * URL is `https://llm.mjovanovic.dev/v1`. It can be overridden with
 * `AI_BASE_URL`; the key itself always comes from `AI_API_KEY` (server-only).
 */
const DEFAULT_BASE_URL = "https://llm.mjovanovic.dev/v1";

/**
 * Default development model for the hackathon gateway. Each adapter can
 * override it through its `OPENAI_<FEATURE>_MODEL` variable without code
 * changes.
 */
export const DEFAULT_AI_MODEL = "gpt-5-mini";

/** Default request budget per AI call (wall clock). */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Effective provider base URL: `AI_BASE_URL` or the hackathon gateway. */
export function getAiBaseUrl(): string {
  return process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

/** Per-call timeout in milliseconds; `OPENAI_AI_TIMEOUT_MS` overrides for all adapters. */
export function getAiTimeoutMs(featureOverride?: string): number {
  const raw = featureOverride?.trim() || process.env.OPENAI_AI_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_TIMEOUT_MS;
}

/**
 * Maps any provider/configuration failure to a safe `AppError("AI", ...)`.
 *
 * Raw provider messages (which can echo headers, URLs, or key fragments) are
 * logged server-side only, sanitized; the user receives a generic message.
 * `AppError`s already carry a safe user message and pass through untouched.
 */
export function toAiServiceError(error: unknown, context: Record<string, string | number | boolean | undefined> = {}): AppError {
  if (error instanceof AppError) return error;
  const { userMessage, logKind } = classifyAiFailure(error);
  logger.error(logKind, { ...context, error_message: sanitizeAiErrorMessage(error) });
  return new AppError("AI", userMessage, error);
}

/** Wraps a fetch promise with a wall-clock timeout rejection. */
export function withAiTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI request timed out.")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}
