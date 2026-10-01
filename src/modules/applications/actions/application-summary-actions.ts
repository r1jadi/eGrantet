"use server";

import { revalidatePath } from "next/cache";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { assertAdminAreaAccess } from "@/lib/auth/server";
import { generateApplicationSummary } from "../services/application-summary-service";

export interface GenerateSummaryState {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: string;
  generatedAt?: string;
}

/** Generates (or regenerates) the AI summary; the municipality employee sees the result after review. */
export async function generateApplicationSummaryAction(_previous: GenerateSummaryState, formData: FormData): Promise<GenerateSummaryState> {
  const applicationId = formData.get("applicationId");
  const parsedId = typeof applicationId === "string" && applicationId.length === 36 ? applicationId : null;
  if (!parsedId) return { status: "error", message: "Invalid application reference." };
  try {
    await assertAdminAreaAccess();
    const result = await generateApplicationSummary(parsedId);
    revalidatePath(`/municipality/applications/${parsedId}`);
    return { status: "success", summary: result.summary, generatedAt: result.generatedAt };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") return { status: "error", message: error.message };
    return { status: "error", message: error instanceof AppError ? error.message : toSafeErrorMessage(error) };
  }
}
