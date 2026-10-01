import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { getCurrentBusinessProfile } from "./business-profile-service";

/**
 * Business "My uploaded documents" persistence.
 *
 * Files live in the private `business-documents` bucket under
 * {userId}/{documentId}/{fileName}. Ownership is double-enforced: the path is
 * derived from the authenticated user's id (never client input), RLS scopes
 * table rows, and view URLs are short-lived signed URLs produced server-side.
 */

const allowedContentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maximumFileSizeBytes = 10 * 1024 * 1024;

export interface BusinessUploadedDocument {
  id: string;
  fileName: string;
  documentType: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export async function listMyBusinessUploads(): Promise<BusinessUploadedDocument[]> {
  const profile = await getCurrentBusinessProfile();
  const { data, error } = await createSupabaseAdminClient()
    .from("business_documents")
    .select("id, file_name, document_type, content_type, file_size_bytes, created_at")
    .eq("user_id", profile.userId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("DATABASE", "Unable to load your documents.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    fileName: String(row.file_name),
    documentType: String(row.document_type),
    contentType: String(row.content_type),
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    createdAt: String(row.created_at),
  }));
}

export async function uploadBusinessDocument(input: { documentType: string; file: File }): Promise<BusinessUploadedDocument> {
  const profile = await getCurrentBusinessProfile();
  const { file } = input;
  const documentType = z.string().trim().min(1).max(100).parse(input.documentType || "OTHER");
  if (!allowedContentTypes.has(file.type)) throw new AppError("VALIDATION", "Only PDF, PNG, and JPEG files are allowed.");
  if (file.size <= 0 || file.size > maximumFileSizeBytes) throw new AppError("VALIDATION", "Document size must be between 1 byte and 10 MB.");

  const admin = createSupabaseAdminClient();
  const documentId = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "document";
  const storagePath = `${profile.userId}/${documentId}/${safeName}`;
  const { error: uploadError } = await admin.storage.from("business-documents").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new AppError("EXTERNAL_SERVICE", "Unable to upload the document.", uploadError);

  const { data, error: insertError } = await admin
    .from("business_documents")
    .insert({
      user_id: profile.userId,
      file_name: file.name,
      storage_path: storagePath,
      document_type: documentType,
      content_type: file.type,
      file_size_bytes: file.size,
    })
    .select("id, file_name, document_type, content_type, file_size_bytes, created_at")
    .single();
  if (insertError) {
    await admin.storage.from("business-documents").remove([storagePath]);
    throw new AppError("DATABASE", "Unable to save the document.", insertError);
  }

  await recordAuditEvent({ actorId: profile.userId, action: "BUSINESS_DOCUMENT_UPLOADED", entityType: "business_document", entityId: String(data.id) });
  return {
    id: String(data.id),
    fileName: String(data.file_name),
    documentType: String(data.document_type),
    contentType: String(data.content_type),
    fileSizeBytes: Number(data.file_size_bytes),
    createdAt: String(data.created_at),
  };
}

export async function deleteBusinessDocument(documentId: string): Promise<void> {
  const profile = await getCurrentBusinessProfile();
  const admin = createSupabaseAdminClient();
  const { data: document, error } = await admin
    .from("business_documents")
    .select("id, user_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the document.", error);
  if (!document) throw new AppError("NOT_FOUND", "Document not found.");
  if (String(document.user_id) !== profile.userId) throw new AppError("AUTHORIZATION", "You cannot remove this document.");

  const { error: removeError } = await admin.storage.from("business-documents").remove([String(document.storage_path)]);
  if (removeError) throw new AppError("EXTERNAL_SERVICE", "Unable to remove the document file.", removeError);
  const { error: deleteError } = await admin.from("business_documents").delete().eq("id", documentId);
  if (deleteError) throw new AppError("DATABASE", "Unable to delete the document.", deleteError);
  await recordAuditEvent({ actorId: profile.userId, action: "BUSINESS_DOCUMENT_DELETED", entityType: "business_document", entityId: documentId });
}

/** Short-lived signed URL for viewing one of the business's own documents. */
export async function getBusinessUploadViewUrl(documentId: string): Promise<string> {
  const profile = await getCurrentBusinessProfile();
  const admin = createSupabaseAdminClient();
  const { data: document, error } = await admin
    .from("business_documents")
    .select("id, user_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the document.", error);
  if (!document) throw new AppError("NOT_FOUND", "Document not found.");
  if (String(document.user_id) !== profile.userId) throw new AppError("AUTHORIZATION", "You cannot view this document.");

  const { data, error: signedError } = await admin.storage.from("business-documents").createSignedUrl(String(document.storage_path), 300);
  if (signedError || !data) throw new AppError("EXTERNAL_SERVICE", "Unable to open the document.", signedError);
  await recordAuditEvent({ actorId: profile.userId, action: "BUSINESS_DOCUMENT_VIEWED", entityType: "business_document", entityId: documentId });
  return data.signedUrl;
}
