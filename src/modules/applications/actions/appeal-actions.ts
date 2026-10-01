"use server";

import { revalidatePath } from "next/cache";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { getAppealForCurrentUser, getAppealForMunicipality, reviewAppeal, submitAppeal } from "../services/appeal-service";

export interface AppealActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Applicant submits an appeal for a rejected application. */
export async function submitAppealAction(_previous: AppealActionState, formData: FormData): Promise<AppealActionState> {
  try {
    const applicationId = formData.get("applicationId");
    if (typeof applicationId !== "string" || applicationId.length !== 36) {
      return { status: "error", message: "Invalid application reference." };
    }
    const appeal = await submitAppeal({
      applicationId,
      reason: formData.get("reason") ?? "",
      explanation: formData.get("explanation") ?? "",
    });
    revalidatePath(`/applications/${applicationId}`);
    return { status: "success", message: `Appeal ${appeal.id.slice(0, 8).toUpperCase()} submitted.` };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") return { status: "error", message: error.message };
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Municipality advances an appeal (UNDER_REVIEW or DECISION_MADE). */
export async function reviewAppealAction(_previous: AppealActionState, formData: FormData): Promise<AppealActionState> {
  try {
    const appealId = formData.get("appealId");
    if (typeof appealId !== "string" || appealId.length !== 36) {
      return { status: "error", message: "Invalid appeal reference." };
    }
    const status = formData.get("status");
    if (status !== "UNDER_REVIEW" && status !== "DECISION_MADE") {
      return { status: "error", message: "Invalid appeal status." };
    }
    const appeal = await reviewAppeal({
      appealId,
      status,
      decisionNote: typeof formData.get("decisionNote") === "string" ? String(formData.get("decisionNote")) : undefined,
    });
    revalidatePath(`/applications/${appeal.applicationId}`);
    revalidatePath(`/municipality/applications/${appeal.applicationId}`);
    revalidatePath("/municipality/appeals");
    return { status: "success", message: `Appeal updated to ${appeal.status}.` };
  } catch (error) {
    if (error instanceof AppError && (error.code === "VALIDATION" || error.code === "CONFLICT")) return { status: "error", message: error.message };
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Loads the signed-in applicant's appeal for one application (or null). */
export async function getAppealForCurrentUserAction(applicationId: string) {
  return getAppealForCurrentUser(applicationId);
}

/** Loads the appeal for one application for municipal review (or null). */
export async function getAppealForMunicipalityAction(applicationId: string) {
  return getAppealForMunicipality(applicationId);
}
