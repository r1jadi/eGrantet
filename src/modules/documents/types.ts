export const DOCUMENT_STATUSES = ["UPLOADED", "REPLACEMENT_REQUESTED", "ARCHIVED"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  requirementId: string | null;
  fileName: string;
  storagePath: string;
  documentType: string;
  status: DocumentStatus;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}
