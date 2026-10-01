import { z } from "zod";
import { DOCUMENT_STATUSES } from "./types";

export const documentMetadataContractSchema = z.object({
  applicationId: z.uuid(),
  requirementId: z.uuid().nullable(),
  fileName: z.string().trim().min(1).max(255),
  storagePath: z.string().trim().min(1).max(1_024),
  documentType: z.string().trim().min(1).max(100),
  status: z.enum(DOCUMENT_STATUSES),
  contentType: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().nonnegative().max(10 * 1024 * 1024),
});
