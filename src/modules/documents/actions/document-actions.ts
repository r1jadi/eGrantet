"use server";

import { z } from "zod";
import { uploadApplicationDocument } from "../services/document-service";

const idSchema = z.uuid();

export async function uploadApplicationDocumentAction(applicationId: string, requirementId: string | null, file: File, documentType: string) {
  return uploadApplicationDocument(idSchema.parse(applicationId), requirementId === null ? null : idSchema.parse(requirementId), file, z.string().trim().min(1).max(100).parse(documentType));
}
