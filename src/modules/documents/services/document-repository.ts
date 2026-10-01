import "server-only";
import type { ApplicationDocument } from "../types";

/** Storage references and metadata only; analysis remains in the AI module. */
export interface DocumentRepository {
  findById(id: string): Promise<ApplicationDocument | null>;
  listForApplication(applicationId: string): Promise<ApplicationDocument[]>;
}
