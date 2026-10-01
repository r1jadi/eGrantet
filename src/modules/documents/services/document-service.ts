import "server-only";
import { randomUUID } from "node:crypto";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";

const allowedContentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maximumFileSizeBytes = 10 * 1024 * 1024;

export async function uploadApplicationDocument(applicationId: string, requirementId: string | null, file: File, documentType: string) {
  const user = await requireAuth();
  if (!allowedContentTypes.has(file.type)) throw new AppError("VALIDATION", "Only PDF, PNG, and JPEG files are allowed.");
  if (file.size <= 0 || file.size > maximumFileSizeBytes) throw new AppError("VALIDATION", "Document size must be between 1 byte and 10 MB.");
  const admin = createSupabaseAdminClient();
  const { data: application, error } = await admin.from("applications").select("id, applicant_id, grant_id, status").eq("id", applicationId).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load application.", error);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  if (application.applicant_id !== user.id) throw new AppError("AUTHORIZATION", "You cannot upload documents for this application.");
  if (application.status !== "DRAFT" && application.status !== "CORRECTION_REQUESTED") throw new AppError("CONFLICT", "This application is no longer editable.");
  if (requirementId) {
    const { data: requirement, error: requirementError } = await admin.from("grant_requirements").select("id, type").eq("id", requirementId).eq("grant_id", application.grant_id).maybeSingle();
    if (requirementError) throw new AppError("DATABASE", "Unable to validate document requirement.", requirementError);
    if (!requirement || requirement.type !== "DOCUMENT") throw new AppError("VALIDATION", "The document requirement does not belong to this grant.");
  }
  const documentId = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "document";
  const storagePath = `applications/${applicationId}/${documentId}/${safeName}`;
  const { error: uploadError } = await admin.storage.from("application-documents").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new AppError("EXTERNAL_SERVICE", "Unable to upload document.", uploadError);
  const { data, error: insertError } = await admin.from("application_documents").insert({ id: documentId, application_id: applicationId, requirement_id: requirementId, file_name: file.name, storage_path: storagePath, document_type: documentType, content_type: file.type, file_size_bytes: file.size, status: "UPLOADED" }).select().single();
  if (insertError) { await admin.storage.from("application-documents").remove([storagePath]); throw new AppError("DATABASE", "Unable to save document metadata.", insertError); }
  await recordAuditEvent({ actorId: user.id, action: "DOCUMENT_UPLOADED", entityType: "application_document", entityId: documentId, metadata: { applicationId, requirementId } });
  return data;
}
