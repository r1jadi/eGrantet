import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logging/logger";
import { createOpenAIClient } from "@/lib/openai/client";
import { getAiModel, getAiTimeoutMs, toAiServiceError, withAiTimeout } from "@/lib/openai/config";
import { buildDecisionLetterPrompt, parseDecisionLetterResponse, type DecisionLetterFacts, type DecisionLetterResult, type DecisionLetterService } from "./decision-letter";

const model = getAiModel(process.env.OPENAI_DECISION_LETTER_MODEL);
const timeoutMs = getAiTimeoutMs(process.env.OPENAI_DECISION_LETTER_TIMEOUT_MS);

/** OpenAI adapter for decision-letter wording. Facts in, structured letter out. */
export class OpenAIDecisionLetterService implements DecisionLetterService {
  async generateDecisionLetter(facts: DecisionLetterFacts): Promise<DecisionLetterResult> {
    const prompt = buildDecisionLetterPrompt(facts);
    const client = createOpenAIClient();
    try {
      const response = await withAiTimeout(
        client.chat.completions.create({
          model,
          // NOTE: no custom `temperature` — sampling params are intentionally
          // left unset so the provider default applies across models.
          messages: [
            { role: "system", content: "You are a precise municipal correspondence writer. You never invent facts." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
        timeoutMs,
      );
      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("AI response was empty.");
      return parseDecisionLetterResponse(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : "Unknown AI failure.";
      if (message.includes("timed out")) {
        logger.warn("ai_decision_letter_timeout", { decision: facts.decision, timeoutMs });
        throw new AppError("AI", "The AI service took too long to respond. Please try again or write the message manually.");
      }
      if (message.includes("AI response")) {
        logger.warn("ai_decision_letter_unexpected_response", { decision: facts.decision });
        throw new AppError("AI", "The AI returned an unexpected response. Please try again or write the message manually.");
      }
      // Provider/configuration failures: sanitized server-side log, safe user message.
      throw toAiServiceError(error, { feature: "decision_letter", model, decision: facts.decision });
    }
  }
}
