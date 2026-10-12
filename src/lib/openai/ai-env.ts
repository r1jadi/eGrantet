/**
 * Pure provider-endpoint resolution for the server-side AI integration.
 *
 * Deliberately no `server-only` import so model/URL/timeout selection stays
 * unit-testable under plain Node. Only server modules may import this file:
 * the values come from server-only env vars and must never reach the client
 * bundle (callers live behind `server-only` boundaries).
 *
 * Current provider: GroqCloud OpenAI-compatible API
 * (`https://api.groq.com/openai/v1`) with `openai/gpt-oss-20b` (text-only,
 * 131k context, JSON object mode). Model precedence per call:
 * per-feature `OPENAI_<FEATURE>_MODEL` > `AI_MODEL` > built-in default.
 */

/** GroqCloud OpenAI-compatible chat completions endpoint. */
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/** Default model: Groq-hosted GPT-OSS 20B (free tier, text in/out, JSON mode). */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";

/** Default request budget per AI call (wall clock). */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Effective provider base URL: `AI_BASE_URL` override or GroqCloud. */
export function getAiBaseUrl(): string {
  return process.env.AI_BASE_URL?.trim() || GROQ_BASE_URL;
}

/**
 * Effective model for one adapter: per-feature override first, then the
 * shared `AI_MODEL`, then the built-in Groq default. Blank values fall
 * through so empty env entries can never select an empty model id.
 */
export function getAiModel(featureOverride?: string): string {
  return featureOverride?.trim() || process.env.AI_MODEL?.trim() || GROQ_DEFAULT_MODEL;
}

/** Per-call timeout in milliseconds; `OPENAI_AI_TIMEOUT_MS` overrides for all adapters. */
export function getAiTimeoutMs(featureOverride?: string): number {
  const raw = featureOverride?.trim() || process.env.OPENAI_AI_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_TIMEOUT_MS;
}
