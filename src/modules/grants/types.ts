export const GRANT_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;
export type GrantStatus = (typeof GRANT_STATUSES)[number];

export const REQUIREMENT_TYPES = ["ELIGIBILITY", "DOCUMENT", "FINANCIAL", "APPLICANT", "PROJECT", "OTHER"] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export const requirementTypeLabels: Record<RequirementType, string> = {
  ELIGIBILITY: "Eligibility",
  DOCUMENT: "Document",
  FINANCIAL: "Financial",
  APPLICANT: "Applicant",
  PROJECT: "Project",
  OTHER: "Other",
};

export interface Grant {
  id: string;
  municipalityId: string;
  title: string;
  description: string;
  status: GrantStatus;
  fundingAmount: number | null;
  fundingCurrency: string | null;
  applicationDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrantRequirement {
  id: string;
  grantId: string;
  name: string;
  description: string;
  type: RequirementType;
  isRequired: boolean;
  configuration: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
