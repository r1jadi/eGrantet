import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logging/logger";
import { createOpenAIClient } from "@/lib/openai/client";
import { getAiModel, getAiTimeoutMs, toAiServiceError, withAiTimeout } from "@/lib/openai/config";
import {
  buildDocumentAnalysisPrompt,
  isVisionDocument,
  parseDocumentAnalysisResponse,
  type DocumentAnalysisInput,
  type DocumentAnalysisResult,
  type DocumentAnalysisService,
} from "./document-analysis";

const model = getAiModel(process.env.OPENAI_DOCUMENT_ANALYSIS_MODEL);
const timeoutMs = getAiTimeoutMs(process.env.OPENAI_DOCUMENT_ANALYSIS_TIMEOUT_MS);

/** Image content types are analyzed via the model's vision input; PDFs as extracted text. */
const visionContentTypes = new Set(["image/png", "image/jpeg"]);

function userContentFor(
  input: DocumentAnalysisInput,
): Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> {
  if (visionContentTypes.has(input.mimeType)) {
    // For scanned documents the extracted "content" is a data URL built by the
    // extraction step; the vision model reads the image directly.
    return [
      { type: "text", text: buildDocumentAnalysisPrompt({ ...input, contentText: "(image document attached)" }) },
      { type: "image_url", image_url: { url: input.contentText } },
    ];
  }
  return [{ type: "text", text: buildDocumentAnalysisPrompt(input) }];
}

/** OpenAI adapter for document analysis. Facts + document content in, structured result out. */
export class OpenAIDocumentAnalysisService implements DocumentAnalysisService {
  async analyzeDocument(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult> {
    // The configured default model is text-only: fail image inputs fast with
    // a clear manual-review outcome instead of sending a doomed vision
    // request (multi-megabyte base64 payload) that the provider rejects.
    // Lift this guard only when pointing the adapter at a vision-capable model.
    if (isVisionDocument(input.mimeType)) {
      throw new AppError(
        "AI",
        `Image documents cannot be analyzed by the configured text-only model (${model}) and need manual review.`,
      );
    }
    const client = createOpenAIClient();
    try {
      const response = await withAiTimeout(
        client.chat.completions.create({
          model,
          // NOTE: no custom `temperature` — sampling params are intentionally
          // left unset so the provider default applies across models.
          messages: [
            {
              role: "system",
              content:
                "You are a precise municipal document analyst. You only report what is actually present in the provided document. You never invent facts, never make funding decisions, and you clearly mark uncertainty.",
            },
            { role: "user", content: userContentFor(input) },
          ],
          response_format: { type: "json_object" },
        }) as Promise<{ choices: Array<{ message?: { content?: string | null } }> }>,
        timeoutMs,
      );
      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("AI response was empty.");
      return parseDocumentAnalysisResponse(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.warn("ai_document_analysis_failed", { fileName: input.fileName.slice(0, 100), model });
      throw toAiServiceError(error);
    }
  }
}
