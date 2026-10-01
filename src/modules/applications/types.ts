import type { DocumentStatus } from "@/modules/documents";
import type { EligibilityResult } from "@/modules/eligibility";

export const APPLICATION_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED", "APPROVED", "REJECTED", "WITHDRAWN"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: string;
  grantId: string;
  applicantId: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  answers: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Row shape for the municipal review queue. Grant, funding, and applicant fields are flattened for the table. */
export interface MunicipalApplicationListItem {
  id: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  createdAt: string;
  grantId: string;
  grantTitle: string;
  fundingAmount: number | null;
  fundingCurrency: string | null;
  applicantId: string;
  applicantName: string;
  applicantOrganisation: string | null;
}

/** Counts of applications grouped by review-relevant status for the dashboard. */
export interface MunicipalApplicationStats {
  total: number;
  readyForReview: number;
  inReview: number;
  approved: number;
  rejected: number;
}

/** Detail shape for the municipal application review page. */
export interface MunicipalApplicationDetail {
  id: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  answers: Record<string, unknown>;
  grant: {
    id: string;
    title: string;
    fundingAmount: number | null;
    fundingCurrency: string | null;
    applicationDeadline: string | null;
    status: string;
  };
  applicant: {
    id: string;
    fullName: string | null;
    organisation: string | null;
    email: string | null;
  };
}

export interface MunicipalApplicationDocument {
  id: string;
  fileName: string;
  documentType: string;
  status: DocumentStatus;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface MunicipalApplicationCheck {
  id: string;
  requirementId: string | null;
  result: EligibilityResult;
  reason: string | null;
  checkedAt: string | null;
}
