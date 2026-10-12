import "server-only";
import OpenAI from "openai";
import { getAiBaseUrl } from "./config";

/**
 * Creates the server-only AI client for the OpenAI-compatible provider.
 *
 * Reads AI_API_KEY (+ optional AI_BASE_URL, defaulting to GroqCloud),
 * falling back to the legacy OPENAI_API_KEY name. Throws a configuration
 * error (never a user-facing one) when unset; callers map it to safe errors.
 * Create a key at https://console.groq.com/keys (owner-operated).
 */
export function createOpenAIClient() {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY is not configured.");
  return new OpenAI({ apiKey, baseURL: getAiBaseUrl(), maxRetries: 0 });
}
