import { AppError } from "@/lib/errors/app-error";
import type { UserRole } from "@/modules/users";

export interface AuthorizationSubject { id: string; role: UserRole; }
export function hasAnyRole(subject: AuthorizationSubject | null, roles: readonly UserRole[]): boolean { return subject !== null && roles.includes(subject.role); }
export function assertRole(subject: AuthorizationSubject | null, roles: readonly UserRole[]): AuthorizationSubject { if (subject === null) throw new AppError("AUTHENTICATION", "You must be signed in."); if (!hasAnyRole(subject, roles)) throw new AppError("AUTHORIZATION", "You do not have permission to perform this action."); return subject; }
export function assertMunicipalityMembership(subject: AuthorizationSubject, isMember: boolean): AuthorizationSubject { if (subject.role === "ADMIN") return subject; if (subject.role !== "MUNICIPAL_EMPLOYEE" || !isMember) throw new AppError("AUTHORIZATION", "You do not have access to this municipality."); return subject; }
export function assertApplicantScope(subject: AuthorizationSubject, applicantId: string): AuthorizationSubject { if (subject.role !== "APPLICANT" || subject.id !== applicantId) throw new AppError("AUTHORIZATION", "You cannot access this applicant's data."); return subject; }
export function assertEvaluatorAssignment(subject: AuthorizationSubject, isAssigned: boolean): AuthorizationSubject { if (subject.role !== "EVALUATOR" || !isAssigned) throw new AppError("AUTHORIZATION", "You are not assigned to this application."); return subject; }
