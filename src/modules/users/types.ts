export const USER_ROLES = ["APPLICANT", "MUNICIPAL_EMPLOYEE", "EVALUATOR", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string | null;
  createdAt: string;
  updatedAt: string;
}
