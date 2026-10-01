import "server-only";
import type { Grant, GrantRequirement } from "../types";

/** Persistence boundary; implementations may use only server-side Supabase clients. */
export interface GrantRepository {
  findById(id: string): Promise<Grant | null>;
  listRequirements(grantId: string): Promise<GrantRequirement[]>;
}
