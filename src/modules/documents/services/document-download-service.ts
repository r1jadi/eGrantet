import "server-only";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Signed-URL download for application documents.
 *
 * Authorization mirrors the AI extraction path: the applicant owner, the
 * owning municipality's members, assigned evaluators, and platform admins can
 * download; everyone else (even with a guessed document id) is rejected
 * before any Storage interaction. The bucket stays fully private — the client
 * only ever receives a short-lived signed URL.
 */
export async function getApplicationDocumentDownloadUrl(documentId: string): Promise<string> {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();
  const { data: document, error } = await admin
    .from("application_documents")
    .select("id, storage_path, applications!inner(id, applicant_id)")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the document.", error);
  if (!document) throw new AppError("NOT_FOUND", "Document not found.");
  const application = document.applications as unknown as { id: string; applicant_id: string };

  if (application.applicant_id !== user.id) {
    const { getApplicationForCurrentUser } = await import("@/modules/applications/services/application-service");
    await getApplicationForCurrentUser(application.id);
  }

  const { data, error: signedError } = await admin.storage.from("application-documents").createSignedUrl(document.storage_path, 300);
  if (signedError || !data) throw new AppError("EXTERNAL_SERVICE", "Unable to open the document.", signedError);
  return data.signedUrl;
}
