import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logging/logger";
import { createOpenAIClient } from "@/lib/openai/client";
import { DEFAULT_AI_MODEL, getAiTimeoutMs, toAiServiceError, withAiTimeout } from "@/lib/openai/config";
import { buildApplicationSummaryPrompt, parseApplicationSummaryResponse, type ApplicationSummaryFacts, type ApplicationSummaryResult, type ApplicationSummaryService } from "./application-summary";

const model = process.env.OPENAI_APPLICATION_SUMMARY_MODEL ?? DEFAULT_AI_MODEL;
const timeoutMs = getAiTimeoutMs(process.env.OPENAI_APPLICATION_SUMMARY_TIMEOUT_MS);

/** OpenAI adapter for application summaries. Facts in, 3–4 sentence summary out. */
export class OpenAIApplicationSummaryService implements ApplicationSummaryService {
  async generateApplicationSummary(facts: ApplicationSummaryFacts): Promise<ApplicationSummaryResult> {
    const prompt = buildApplicationSummaryPrompt(facts);
    const client = createOpenAIClient();
    try {
      const response = await withAiTimeout(
        client.chat.completions.create({
          model,
          // NOTE: no custom `temperature` — the hackathon gateway's gpt-5-mini
          // (reasoning model behind LiteLLM) rejects non-default values.
          messages: [
            { role: "system", content: "You are a precise municipal analyst. You summarize only what you are given and never invent facts, results, or decisions." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
        timeoutMs,
      );
      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("AI response was empty.");
      return parseApplicationSummaryResponse(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : "Unknown AI failure.";
      if (message.includes("timed out")) {
        logger.warn("ai_application_summary_timeout", { reference: facts.reference, timeoutMs });
        throw new AppError("AI", "The AI service took too long to respond. Please try again.");
      }
      if (message.includes("3–4 sentence") || message.includes("AI response")) {
        logger.warn("ai_application_summary_unexpected_response", { reference: facts.reference });
        throw new AppError("AI", "The AI returned an unexpected summary. Please try again.");
      }
      // Provider/configuration failures: sanitized server-side log, safe user message.
      throw toAiServiceError(error, { feature: "application_summary", model, reference: facts.reference });
    }
  }
}
