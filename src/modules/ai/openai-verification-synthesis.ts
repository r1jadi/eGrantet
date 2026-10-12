import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logging/logger";
import { createOpenAIClient } from "@/lib/openai/client";
import { getAiModel, getAiTimeoutMs, toAiServiceError, withAiTimeout } from "@/lib/openai/config";
import {
  buildVerificationSynthesisPrompt,
  parseVerificationSynthesisResponse,
  type SynthesisResult,
  type VerificationSynthesisInput,
  type VerificationSynthesisService,
} from "./verification-synthesis";

const model = getAiModel(process.env.OPENAI_VERIFICATION_SYNTHESIS_MODEL);
const timeoutMs = getAiTimeoutMs(process.env.OPENAI_VERIFICATION_SYNTHESIS_TIMEOUT_MS);

/** OpenAI adapter for verification synthesis. Evidence in, findings + summary out. */
export class OpenAIVerificationSynthesisService implements VerificationSynthesisService {
  async synthesize(input: VerificationSynthesisInput): Promise<SynthesisResult> {
    const client = createOpenAIClient();
    try {
      const response = await withAiTimeout(
        client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a precise municipal verification assistant. You only reorganize the evidence you are given. Deterministic results are authoritative. You never invent facts and never decide funding.",
            },
            { role: "user", content: buildVerificationSynthesisPrompt(input) },
          ],
          response_format: { type: "json_object" },
        }) as Promise<{ choices: Array<{ message?: { content?: string | null } }> }>,
        timeoutMs,
      );
      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("AI response was empty.");
      return parseVerificationSynthesisResponse(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.warn("ai_verification_synthesis_failed", { model });
      throw toAiServiceError(error);
    }
  }
}
