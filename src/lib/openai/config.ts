import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logging/logger";
import { classifyAiFailure, sanitizeAiErrorMessage } from "./ai-errors";

/**
 * Server-side AI provider configuration and failure mapping.
 *
 * Provider: GroqCloud OpenAI-compatible API
 * (`https://api.groq.com/openai/v1`, overridable with `AI_BASE_URL`).
 * Model selection lives in `./ai-env` (pure, unit-testable):
 * per-feature `OPENAI_<FEATURE>_MODEL` > shared `AI_MODEL` > the built-in
 * Groq default (`openai/gpt-oss-20b`). The key itself always comes from
 * `AI_API_KEY` (server-only).
 */
export {
  GROQ_BASE_URL,
  GROQ_DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  getAiBaseUrl,
  getAiModel,
  getAiTimeoutMs,
} from "./ai-env";

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
