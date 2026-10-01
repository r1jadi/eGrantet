import "server-only";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Secure document content extraction for AI analysis.
 *
 * Access rule: the actor must be able to access the parent application
 * (applicant owner, municipality member, assigned evaluator, or platform
 * admin) — checked through the same authorization path the review UI uses —
 * before any bytes are read from private Storage. Content never leaves the
 * server except inside the AI request payload.
 */

const maximumBytes = 10 * 1024 * 1024; // mirrors upload validation
const maximumTextCharacters = 60_000; // bounds prompt size / cost

export interface ExtractedDocumentContent {
  /** Text for PDFs; a data URL for images (AI vision input); empty when unreadable. */
  content: string;
  /** True when the content is an image data URL for vision analysis. */
  isImage: boolean;
  truncated: boolean;
}

/** Loads document metadata with its application, enforcing access first. */
async function loadAccessibleDocument(documentId: string) {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("application_documents")
    .select("id, application_id, storage_path, content_type, file_name, applications!inner(id, applicant_id, grant_id)")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the document.", error);
  if (!data) throw new AppError("NOT_FOUND", "Document not found.");
  const application = data.applications as unknown as { id: string; applicant_id: string; grant_id: string };
  // Ownership short-circuit for applicants; otherwise the municipal access
  // boundary (which also covers assigned evaluators and platform admins via
  // RLS-backed roles) applies.
  if (application.applicant_id !== user.id) {
    const { getApplicationForCurrentUser } = await import("@/modules/applications/services/application-service");
    await getApplicationForCurrentUser(application.id);
  }
  return { document: data, applicationId: application.id as string };
}

/** Extracts usable content from a stored document for AI analysis. */
export async function extractDocumentContent(documentId: string): Promise<ExtractedDocumentContent> {
  const { document } = await loadAccessibleDocument(documentId);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from("application-documents").download(document.storage_path as string);
  if (error || !data) throw new AppError("EXTERNAL_SERVICE", "Unable to read the document.", error);
  if (data.size > maximumBytes) throw new AppError("VALIDATION", "The document is too large to analyze.");

  const contentType = String(document.content_type ?? "");
  if (contentType === "image/png" || contentType === "image/jpeg") {
    const buffer = Buffer.from(await data.arrayBuffer());
    return { content: `data:${contentType};base64,${buffer.toString("base64")}`, isImage: true, truncated: false };
  }

  if (contentType === "application/pdf") {
    const buffer = Buffer.from(await data.arrayBuffer());
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const merged = (Array.isArray(text) ? text.join("\n") : text) ?? "";
      const normalized = merged.replace(/\u0000/g, "").trim();
      if (!normalized) return { content: "", isImage: false, truncated: false };
      return {
        content: normalized.length > maximumTextCharacters ? normalized.slice(0, maximumTextCharacters) : normalized,
        isImage: false,
        truncated: normalized.length > maximumTextCharacters,
      };
    } catch {
      // Encrypted, scanned-only, or malformed PDFs are surfaced as unreadable
      // rather than pretending extraction succeeded.
      return { content: "", isImage: false, truncated: false };
    }
  }

  throw new AppError("VALIDATION", "This document format is not supported for analysis.");
}
