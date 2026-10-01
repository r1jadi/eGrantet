import "server-only";
import type { Application } from "../types";

/** Persistence boundary for future application services; no lifecycle mutations yet. */
export interface ApplicationRepository {
  findById(id: string): Promise<Application | null>;
  listForApplicant(applicantId: string): Promise<Application[]>;
}
