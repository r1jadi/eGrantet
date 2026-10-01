export interface AuditEvent { actorId?: string; eventType: string; entityType: string; entityId: string; occurredAt: Date; metadata?: Record<string, unknown>; }
export interface AuditService { record(event: AuditEvent): Promise<void>; }

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
