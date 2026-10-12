"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { assertAdminAreaAccess } from "@/lib/auth/server";
import { enforceRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { generateApplicationSummary } from "../services/application-summary-service";

export interface GenerateSummaryState {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: string;
  generatedAt?: string;
}

/** Generates (or regenerates) the AI summary; the municipality employee sees the result after review. */
export async function generateApplicationSummaryAction(_previous: GenerateSummaryState, formData: FormData): Promise<GenerateSummaryState> {
  const parsedId = z.uuid().safeParse(formData.get("applicationId"));
  if (!parsedId.success) return { status: "error", message: "Invalid application reference." };
  try {
    await assertAdminAreaAccess();
    // AI-heavy operation: per-client budget (best-effort per-instance).
    enforceRateLimit({ key: `ai:summary:${await getClientIp()}`, limit: 20, windowMs: 10 * 60 * 1_000 });
    const result = await generateApplicationSummary(parsedId.data);
    revalidatePath(`/municipality/applications/${parsedId.data}`);
    return { status: "success", summary: result.summary, generatedAt: result.generatedAt };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") return { status: "error", message: error.message };
    return { status: "error", message: error instanceof AppError ? error.message : toSafeErrorMessage(error) };
  }
}
