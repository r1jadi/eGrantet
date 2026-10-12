"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { enforceRateLimit, getClientIp } from "@/lib/security/rate-limit";
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
  const parsedId = z.uuid().safeParse(formData.get("applicationId"));
  if (!parsedId.success) return { status: "error", message: "Invalid application reference." };
  try {
    // AI-heavy operation: per-client budget (best-effort per-instance).
    enforceRateLimit({ key: `ai:verification:${await getClientIp()}`, limit: 20, windowMs: 10 * 60 * 1_000 });
    const { status, runId } = await runApplicationVerification(parsedId.data);
    revalidatePath(`/municipality/applications/${parsedId.data}`);
    return { status: "success", verificationStatus: status, runId };
  } catch (error) {
    return { status: "error", message: error instanceof AppError ? error.message : toSafeErrorMessage(error) };
  }
}
