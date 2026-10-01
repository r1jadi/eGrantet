import "server-only";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ApplicationDocumentListItem {
  id: string;
  requirementId: string | null;
  fileName: string;
  fileSizeBytes: number;
  status: string;
  createdAt: string;
}

/** Lists the applicant's own documents for one application (ownership enforced). */
export async function listDocumentsForApplication(applicationId: string): Promise<ApplicationDocumentListItem[]> {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();
  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, applicant_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) throw new AppError("DATABASE", "Unable to load the application.", applicationError);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  if (application.applicant_id !== user.id) throw new AppError("AUTHORIZATION", "You cannot view these documents.");

  const { data, error } = await admin
    .from("application_documents")
    .select("id, requirement_id, file_name, file_size_bytes, status, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load the documents.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    requirementId: (row.requirement_id as string | null) ?? null,
    fileName: String(row.file_name),
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    status: String(row.status),
    createdAt: String(row.created_at),
  }));
}
