import "server-only";
import { requireMunicipalityAccess } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AuditTrailEntry {
  id: string;
  action: string;
  actorId: string | null;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Audit history for one application.
 *
 * Read-side authorization: the caller must be municipality staff of the
 * grant's municipality (same boundary as the review UI). Audit rows are
 * returned newest-first; contents are server-owned and never exposed to
 * applicants.
 */
export async function listApplicationAuditTrail(applicationId: string, limit = 50): Promise<AuditTrailEntry[]> {
  const admin = createSupabaseAdminClient();
  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, grants!inner(municipality_id)")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) throw new AppError("DATABASE", "Unable to load the application.", applicationError);
  if (!application) throw new AppError("NOT_FOUND", "Application not found.");
  const grant = application.grants as unknown as { municipality_id: string };
  await requireMunicipalityAccess(grant.municipality_id);

  const { data, error } = await admin
    .from("audit_logs")
    .select("id, action, actor_id, entity_type, entity_id, created_at, metadata")
    .or(`entity_id.eq.${applicationId},and(entity_type.eq.application,entity_id.eq.${applicationId})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new AppError("DATABASE", "Unable to load the audit history.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    action: String(row.action),
    actorId: (row.actor_id as string | null) ?? null,
    entityType: String(row.entity_type),
    entityId: (row.entity_id as string | null) ?? null,
    createdAt: String(row.created_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}
