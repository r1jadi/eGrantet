import type { UserRole } from "./types";

/** Contract for future authorization policies; no permissions are granted here yet. */
export interface PermissionPolicy {
  can(role: UserRole, permission: string): boolean;
}
