import { AppError } from "@/lib/errors/app-error";
import type { GrantStatus } from "./types";
const transitions: Record<GrantStatus, GrantStatus[]> = { DRAFT: ["PUBLISHED"], PUBLISHED: ["CLOSED"], CLOSED: ["ARCHIVED"], ARCHIVED: [] };
export function assertGrantTransition(from: GrantStatus, to: GrantStatus) { if (!transitions[from].includes(to)) throw new AppError("VALIDATION", `A grant cannot move from ${from} to ${to}.`); }
