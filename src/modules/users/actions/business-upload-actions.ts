"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { deleteBusinessDocument, listMyBusinessUploads, uploadBusinessDocument } from "../services/business-upload-service";

export interface BusinessUploadState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Lists the signed-in business's uploaded documents. */
export async function listMyBusinessUploadsAction() {
  return listMyBusinessUploads();
}

/** Uploads one business document (server-side type/size validation). */
export async function uploadBusinessDocumentAction(_previous: BusinessUploadState, formData: FormData): Promise<BusinessUploadState> {
  try {
    const file = formData.get("file");
    const documentTypeRaw = formData.get("documentType");
    if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a file to upload." };
    const documentType = z.string().trim().max(100).parse(typeof documentTypeRaw === "string" && documentTypeRaw.trim() ? documentTypeRaw.trim() : "OTHER");
    await uploadBusinessDocument({ documentType, file });
    revalidatePath("/profile/business");
    return { status: "success", message: `${file.name} uploaded.` };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") return { status: "error", message: error.message };
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Deletes one of the business's own documents. */
export async function deleteBusinessDocumentAction(_previous: BusinessUploadState, formData: FormData): Promise<BusinessUploadState> {
  try {
    const documentId = z.uuid().parse(formData.get("documentId"));
    await deleteBusinessDocument(documentId);
    revalidatePath("/profile/business");
    return { status: "success", message: "Document removed." };
  } catch (error) {
    if (error instanceof AppError && (error.code === "VALIDATION" || error.code === "NOT_FOUND" || error.code === "AUTHORIZATION")) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}

/** Returns a short-lived signed view URL for one of the business's own documents. */
export async function viewBusinessDocumentAction(documentId: string): Promise<string> {
  const id = z.uuid().parse(documentId);
  return getSignedViewUrl(id);
}

async function getSignedViewUrl(documentId: string): Promise<string> {
  const { getBusinessUploadViewUrl } = await import("../services/business-upload-service");
  return getBusinessUploadViewUrl(documentId);
}
