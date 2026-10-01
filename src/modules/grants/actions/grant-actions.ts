"use server";

import { z } from "zod";
import { assertAdminAreaAccess } from "@/lib/auth/server";
import { createGrant, deleteDraftGrant, deleteGrantRequirement, getMunicipalityDashboardStats, getGrantForManagement, listMunicipalitiesForCurrentUser, listMunicipalityGrants, reorderGrantRequirements, saveGrantRequirement, transitionGrant, updateGrant } from "../services/grant-service";
import { GRANT_STATUSES } from "../types";
import { reorderRequirementsSchema } from "../schemas";

const idSchema = z.uuid();

export async function createGrantAction(input: unknown) { await assertAdminAreaAccess(); return createGrant(input); }
export async function updateGrantAction(grantId: string, input: unknown) { await assertAdminAreaAccess(); return updateGrant(idSchema.parse(grantId), input); }
export async function transitionGrantAction(grantId: string, status: unknown) { await assertAdminAreaAccess(); return transitionGrant(idSchema.parse(grantId), z.enum(GRANT_STATUSES).parse(status)); }
export async function deleteDraftGrantAction(grantId: string) { await assertAdminAreaAccess(); return deleteDraftGrant(idSchema.parse(grantId)); }
export async function listMunicipalityGrantsAction(input: unknown) { await assertAdminAreaAccess(); return listMunicipalityGrants(input); }
export async function listMunicipalitiesForCurrentUserAction() { await assertAdminAreaAccess(); return listMunicipalitiesForCurrentUser(); }
export async function getMunicipalityDashboardStatsAction() { await assertAdminAreaAccess(); return getMunicipalityDashboardStats(); }
export async function getGrantForManagementAction(grantId: string) { await assertAdminAreaAccess(); return getGrantForManagement(idSchema.parse(grantId)); }
export async function saveGrantRequirementAction(grantId: string, input: unknown, requirementId?: string) { await assertAdminAreaAccess(); return saveGrantRequirement(idSchema.parse(grantId), input, requirementId ? idSchema.parse(requirementId) : undefined); }
export async function deleteGrantRequirementAction(grantId: string, requirementId: string) { await assertAdminAreaAccess(); return deleteGrantRequirement(idSchema.parse(grantId), idSchema.parse(requirementId)); }
export async function reorderGrantRequirementsAction(grantId: string, requirementIds: unknown) { await assertAdminAreaAccess(); return reorderGrantRequirements(idSchema.parse(grantId), reorderRequirementsSchema.parse(requirementIds).requirementIds); }
