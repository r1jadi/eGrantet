"use server";

import { revalidatePath } from "next/cache";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { runApplicationVerification } from "@/modules/verification/services/verification-service";

export interface RunVerificationState {
  status: "idle" | "success" | "error";
  message?: string;
  verificationStatus?: string;
  runId?: string;
}

/**
 * Runs (or re-runs) the full AI-assisted verification for one application.
 * Authorization, lifecycle and auditing live in the verification service;
 * this action only translates results into UI state.
 */
export async function runApplicationVerificationAction(_previous: RunVerificationState, formData: FormData): Promise<RunVerificationState> {
  const applicationId = formData.get("applicationId");
  const parsedId = typeof applicationId === "string" && applicationId.length === 36 ? applicationId : null;
  if (!parsedId) return { status: "error", message: "Invalid application reference." };
  try {
    const { status, runId } = await runApplicationVerification(parsedId);
    revalidatePath(`/municipality/applications/${parsedId}`);
    return { status: "success", verificationStatus: status, runId };
  } catch (error) {
    return { status: "error", message: error instanceof AppError ? error.message : toSafeErrorMessage(error) };
  }
}
