"use server";

import { revalidatePath } from "next/cache";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { generateDecisionLetter, sendDecisionLetter } from "../services/decision-letter-service";
import { z } from "zod";

const generateSchema = z.object({
  applicationId: z.uuid(),
  decision: z.enum(["ACCEPTANCE", "REJECTION"]),
  reviewerNote: z.string().trim().max(2_000).optional(),
});

export interface GenerateLetterState {
  status: "idle" | "success" | "error";
  message?: string;
  subject?: string;
  body?: string;
  factsJson?: string;
}

/** Generates AI wording for the municipality's decision; the caller reviews/edits before sending. */
export async function generateDecisionLetterAction(_previous: GenerateLetterState, formData: FormData): Promise<GenerateLetterState> {
  const parsed = generateSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    reviewerNote: formData.get("reviewerNote") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "The letter request was invalid." };
  }
  try {
    // Authorization lives in the service: buildDecisionLetterFacts →
    // getMunicipalApplicationDetail enforces municipality membership, so
    // staff can generate letters for their own municipality's applications.
    const letter = await generateDecisionLetter(parsed.data.applicationId, parsed.data.decision, parsed.data.reviewerNote);
    return { status: "success", subject: letter.subject, body: letter.body, factsJson: JSON.stringify(letter.facts) };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") return { status: "error", message: error.message };
    return { status: "error", message: error instanceof AppError ? error.message : toSafeErrorMessage(error) };
  }
}

const sendSchema = z.object({
  applicationId: z.uuid(),
  decision: z.enum(["ACCEPTANCE", "REJECTION"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
  wasEdited: z.string().optional(),
});

export interface SendLetterState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Sends the reviewed letter; requires explicit administrator confirmation via the form. */
export async function sendDecisionLetterAction(_previous: SendLetterState, formData: FormData): Promise<SendLetterState> {
  const parsed = sendSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    wasEdited: formData.get("wasEdited"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "The letter could not be sent." };
  }
  if (formData.get("confirmed") !== "on") {
    return { status: "error", message: "Confirm the final message before sending." };
  }
  try {
    // Authorization lives in the service: sendDecisionLetter loads through
    // getMunicipalApplicationDetail (municipality membership boundary).
    // Form fields are strings; the service contract expects a boolean.
    const result = await sendDecisionLetter({ ...parsed.data, wasEdited: parsed.data.wasEdited === "true" });
    revalidatePath("/municipality/applications");
    revalidatePath(`/municipality/applications/${parsed.data.applicationId}`);
    return { status: "success", message: `Letter sent. Application status: ${result.applicationStatus}.` };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") return { status: "error", message: error.message };
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}
