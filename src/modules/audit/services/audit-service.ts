import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
export async function recordAuditEvent(input: { actorId?: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }) { const { error } = await createSupabaseAdminClient().from("audit_logs").insert({ actor_id: input.actorId ?? null, action: input.action, entity_type: input.entityType, entity_id: input.entityId ?? null, metadata: input.metadata ?? {} }); if (error) { logger.error("audit_write_failed", { action: input.action }); } }
