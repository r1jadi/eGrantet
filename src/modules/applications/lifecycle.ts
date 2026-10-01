import { AppError } from "@/lib/errors/app-error";
export type ManagedApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "CORRECTION_REQUESTED" | "APPROVED" | "REJECTED" | "WITHDRAWN";
const transitions: Record<ManagedApplicationStatus, ManagedApplicationStatus[]> = { DRAFT: ["SUBMITTED", "WITHDRAWN"], SUBMITTED: ["UNDER_REVIEW"], UNDER_REVIEW: ["CORRECTION_REQUESTED", "APPROVED", "REJECTED"], CORRECTION_REQUESTED: ["SUBMITTED", "WITHDRAWN"], APPROVED: [], REJECTED: [], WITHDRAWN: [] };
export function assertApplicationTransition(from: ManagedApplicationStatus, to: ManagedApplicationStatus) { if (!transitions[from].includes(to)) throw new AppError("VALIDATION", `An application cannot move from ${from} to ${to}.`); }

/** Read-only view of the lifecycle for UI action menus; enforcement stays in assertApplicationTransition. */
export function listAvailableApplicationTransitions(from: ManagedApplicationStatus): ManagedApplicationStatus[] { return [...transitions[from]]; }
