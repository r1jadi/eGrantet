import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { getCurrentMunicipalityMemberships, requireMunicipalityAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { assertGrantTransition } from "../lifecycle";
import { grantContractSchema, grantDiscoverySchema, grantRequirementContractSchema, municipalityGrantFilterSchema } from "../schemas";
import type { GrantStatus } from "../types";

const grantSelect = "id, municipality_id, title, description, status, funding_amount, funding_currency, maximum_amount_per_applicant, application_deadline, created_at, updated_at";

/**
 * Loads a grant and enforces municipal ownership in one step. Returns the
 * actor profile and grant context used by every mutation service below so
 * lifecycle/authorization rules cannot be bypassed by skipping this helper.
 */
export async function requireGrantContext(grantId: string) {
  const { data: grant, error } = await createSupabaseAdminClient().from("grants").select("id, municipality_id, status, title").eq("id", grantId).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load grant.", error);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found.");
  const actor = await requireMunicipalityAccess(grant.municipality_id);
  return { actorId: actor.id, grantId: grant.id, municipalityId: grant.municipality_id, status: grant.status as GrantStatus, title: grant.title };
}

/** The current user's municipality memberships (empty for pure applicants). */
export async function listMunicipalitiesForCurrentUser() {
  const memberships = await getCurrentMunicipalityMemberships();
  if (!memberships.length) return [];
  const ids = memberships.map((membership) => membership.municipalityId);
  const { data, error } = await createSupabaseAdminClient().from("municipalities").select("id, name").in("id", ids);
  if (error) throw new AppError("DATABASE", "Unable to load municipalities.", error);
  return data.map((municipality) => ({ id: municipality.id, name: municipality.name }));
}

export type MunicipalityGrantFilter = z.infer<typeof municipalityGrantFilterSchema>;

/** Lists the member municipalities' grants with optional search/status filter. */
export async function listMunicipalityGrants(input: unknown) {
  const query = municipalityGrantFilterSchema.parse(input);
  const memberships = await getCurrentMunicipalityMemberships();
  if (!memberships.length) return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
  let request = createSupabaseAdminClient()
    .from("grants")
    .select(`${grantSelect}, municipalities(name)`, { count: "exact" })
    .in("municipality_id", memberships.map((membership) => membership.municipalityId))
    .order("created_at", { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1);
  if (query.status) request = request.eq("status", query.status);
  if (query.search) request = request.ilike("title", `%${query.search}%`);
  const { data, error, count } = await request;
  if (error) throw new AppError("DATABASE", "Unable to load grants.", error);
  return { items: data, total: count ?? 0, page: query.page, pageSize: query.pageSize };
}

export interface MunicipalityGrantStats {
  total: number;
  draft: number;
  published: number;
  closed: number;
  archived: number;
  applicationsByStatus: Record<string, number>;
  totalApplications: number;
  recentGrants: Array<{ id: string; title: string; status: GrantStatus; updatedAt: string; applicationCount: number }>;
}

/** Aggregated overview for the dashboard across all member municipalities. */
export async function getMunicipalityDashboardStats(): Promise<MunicipalityGrantStats> {
  const memberships = await getCurrentMunicipalityMemberships();
  const stats: MunicipalityGrantStats = { total: 0, draft: 0, published: 0, closed: 0, archived: 0, applicationsByStatus: {}, totalApplications: 0, recentGrants: [] };
  if (!memberships.length) return stats;
  const municipalityIds = memberships.map((membership) => membership.municipalityId);
  const admin = createSupabaseAdminClient();
  const { data: grants, error: grantsError } = await admin.from("grants").select("id, title, status, updated_at").in("municipality_id", municipalityIds).order("updated_at", { ascending: false });
  if (grantsError) throw new AppError("DATABASE", "Unable to load grant statistics.", grantsError);
  for (const grant of grants) {
    stats.total += 1;
    if (grant.status === "DRAFT") stats.draft += 1;
    else if (grant.status === "PUBLISHED") stats.published += 1;
    else if (grant.status === "CLOSED") stats.closed += 1;
    else if (grant.status === "ARCHIVED") stats.archived += 1;
  }
  // One embedded query covers both the status overview and per-grant counts.
  const { data: applications, error: applicationsError } = await admin.from("applications").select("grant_id, status, grants!inner(municipality_id)").in("grants.municipality_id", municipalityIds);
  if (applicationsError) throw new AppError("DATABASE", "Unable to load application statistics.", applicationsError);
  const countsByGrant = new Map<string, number>();
  for (const row of applications) {
    stats.totalApplications += 1;
    stats.applicationsByStatus[row.status] = (stats.applicationsByStatus[row.status] ?? 0) + 1;
    countsByGrant.set(row.grant_id, (countsByGrant.get(row.grant_id) ?? 0) + 1);
  }
  stats.recentGrants = grants.slice(0, 5).map((grant) => ({ id: grant.id, title: grant.title, status: grant.status as GrantStatus, updatedAt: grant.updated_at, applicationCount: countsByGrant.get(grant.id) ?? 0 }));
  return stats;
}
export async function createGrant(input: unknown) { const data = grantContractSchema.parse(input); const municipalityId = (input as { municipalityId?: string }).municipalityId; if (typeof municipalityId !== "string") throw new AppError("VALIDATION", "Municipality is required."); const actor = await requireMunicipalityAccess(municipalityId); const { data: grant, error } = await createSupabaseAdminClient().from("grants").insert({ municipality_id: municipalityId, title: data.title, description: data.description, status: "DRAFT", funding_amount: data.fundingAmount, funding_currency: data.fundingCurrency, maximum_amount_per_applicant: data.maximumAmountPerApplicant, application_deadline: data.applicationDeadline }).select(grantSelect).single(); if (error) throw new AppError("DATABASE", "Unable to create grant.", error); await recordAuditEvent({ actorId: actor.id, action: "GRANT_CREATED", entityType: "grant", entityId: grant.id }); return grant; }
export async function updateGrant(id: string, input: unknown) { const data = grantContractSchema.parse(input); const admin = createSupabaseAdminClient(); const { data: current, error: loadError } = await admin.from("grants").select("municipality_id, status").eq("id", id).maybeSingle(); if (loadError) throw new AppError("DATABASE", "Unable to load grant.", loadError); if (!current) throw new AppError("UNKNOWN", "Grant not found."); await requireMunicipalityAccess(current.municipality_id); if (current.status !== "DRAFT") throw new AppError("AUTHORIZATION", "Only draft grants can be edited."); const { data: grant, error } = await admin.from("grants").update({ title: data.title, description: data.description, funding_amount: data.fundingAmount, funding_currency: data.fundingCurrency, maximum_amount_per_applicant: data.maximumAmountPerApplicant, application_deadline: data.applicationDeadline }).eq("id", id).select(grantSelect).single(); if (error) throw new AppError("DATABASE", "Unable to update grant.", error); return grant; }
export async function transitionGrant(id: string, to: GrantStatus) { const admin = createSupabaseAdminClient(); const { data: grant, error } = await admin.from("grants").select("id, municipality_id, status, application_deadline").eq("id", id).maybeSingle(); if (error) throw new AppError("DATABASE", "Unable to load grant.", error); if (!grant) throw new AppError("UNKNOWN", "Grant not found."); const actor = await requireMunicipalityAccess(grant.municipality_id); assertGrantTransition(grant.status as GrantStatus, to); if (to === "PUBLISHED" && (!grant.application_deadline || new Date(grant.application_deadline) <= new Date())) throw new AppError("VALIDATION", "A future application deadline is required before publishing."); const { data, error: updateError } = await admin.from("grants").update({ status: to }).eq("id", id).select(grantSelect).single(); if (updateError) throw new AppError("DATABASE", "Unable to update grant status.", updateError); await recordAuditEvent({ actorId: actor.id, action: `GRANT_${to}`, entityType: "grant", entityId: id }); if (to === "PUBLISHED") { // Personalized recommendation emails fire after the audit record; the
 // service is failure-tolerant and never blocks publication.
 const { notifyRelevantUsersOfPublishedGrant } = await import("@/modules/notifications/services/grant-recommendation-service");
 await notifyRelevantUsersOfPublishedGrant(id); } return data; }

/** Deletes a grant that is still a draft (drafts are the only deletable state). */
export async function deleteDraftGrant(id: string) {
  const admin = createSupabaseAdminClient();
  const { data: grant, error } = await admin.from("grants").select("id, municipality_id, status").eq("id", id).maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load grant.", error);
  if (!grant) throw new AppError("NOT_FOUND", "Grant not found.");
  const actor = await requireMunicipalityAccess(grant.municipality_id);
  if (grant.status !== "DRAFT") throw new AppError("VALIDATION", "Only draft grants can be deleted.");
  const { count: requirementCount, error: requirementsError } = await admin.from("grant_requirements").select("id", { count: "exact", head: true }).eq("grant_id", id);
  if (requirementsError) throw new AppError("DATABASE", "Unable to verify grant requirements.", requirementsError);
  if (requirementCount && requirementCount > 0) {
    const { error: deleteRequirementsError } = await admin.from("grant_requirements").delete().eq("grant_id", id);
    if (deleteRequirementsError) throw new AppError("DATABASE", "Unable to remove the grant requirements.", deleteRequirementsError);
  }
  const { error: deleteError } = await admin.from("grants").delete().eq("id", id).eq("status", "DRAFT");
  if (deleteError) throw new AppError("DATABASE", "Unable to delete the grant.", deleteError);
  await recordAuditEvent({ actorId: actor.id, action: "GRANT_DELETED", entityType: "grant", entityId: id, metadata: { title: undefined } });
}
export async function listPublishedGrants(input: unknown) { const query = grantDiscoverySchema.parse(input); const admin = createSupabaseAdminClient(); const from = (query.page - 1) * query.pageSize; let request = admin.from("grants").select(`${grantSelect}, municipalities(id, name)`, { count: "exact" }).eq("status", query.active === false ? "CLOSED" : "PUBLISHED").order("application_deadline", { ascending: true }).range(from, from + query.pageSize - 1); if (query.search) request = request.ilike("title", `%${query.search}%`); if (query.municipalityId) request = request.eq("municipality_id", query.municipalityId); if (query.minFunding !== undefined) request = request.gte("funding_amount", query.minFunding); if (query.maxFunding !== undefined) request = request.lte("funding_amount", query.maxFunding); const { data, error, count } = await request; if (error) throw new AppError("DATABASE", "Unable to load grants.", error); return { items: data, total: count ?? 0, page: query.page, pageSize: query.pageSize }; }
export async function getPublicGrantDetail(id: string) { const { data, error } = await createSupabaseAdminClient().from("grants").select(`${grantSelect}, municipalities(id, name), grant_requirements(id, name, description, type, is_required, configuration, display_order)`).eq("id", id).eq("status", "PUBLISHED").maybeSingle(); if (error) throw new AppError("DATABASE", "Unable to load grant.", error); if (!data) throw new AppError("NOT_FOUND", "Grant not found."); return { ...data, applicationAvailable: !data.application_deadline || new Date(data.application_deadline) > new Date() }; }
/** Full grant + requirements + criteria + application summary for the management console. */
export async function getGrantForManagement(grantId: string) {
  const { grantId: id } = await requireGrantContext(grantId);
  const admin = createSupabaseAdminClient();
  const [grantResult, requirementsResult, criteriaResult, applicationStatsResult] = await Promise.all([
    admin.from("grants").select(`${grantSelect}, municipalities(id, name)`).eq("id", id).single(),
    admin.from("grant_requirements").select("id, grant_id, name, description, type, is_required, configuration, display_order, created_at, updated_at").eq("grant_id", id).order("display_order", { ascending: true }),
    admin.from("evaluation_criteria").select("id, grant_id, name, description, maximum_score, weight, display_order").eq("grant_id", id).order("display_order", { ascending: true }),
    admin.from("applications").select("status", { count: "exact" }).eq("grant_id", id),
  ]);
  if (grantResult.error) throw new AppError("DATABASE", "Unable to load grant.", grantResult.error);
  if (requirementsResult.error) throw new AppError("DATABASE", "Unable to load grant requirements.", requirementsResult.error);
  if (criteriaResult.error) throw new AppError("DATABASE", "Unable to load evaluation criteria.", criteriaResult.error);
  if (applicationStatsResult.error) throw new AppError("DATABASE", "Unable to load application statistics.", applicationStatsResult.error);
  const counts: Record<string, number> = {};
  for (const row of applicationStatsResult.data) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return {
    grant: grantResult.data,
    requirements: requirementsResult.data.map((requirement) => ({
      ...requirement,
      configuration: requirement.configuration as Record<string, unknown>,
    })),
    criteria: criteriaResult.data.map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description,
      maximumScore: Number(criterion.maximum_score),
      weight: Number(criterion.weight),
      displayOrder: criterion.display_order,
    })),
    applicationCounts: counts,
    totalApplications: applicationStatsResult.count ?? 0,
  };
}

/** Atomically reorders a grant's requirements (draft grants only). */
export async function reorderGrantRequirements(grantId: string, orderedRequirementIds: string[]) {
  const { actorId, status } = await requireGrantContext(grantId);
  if (status !== "DRAFT") throw new AppError("AUTHORIZATION", "Requirements can only be changed on draft grants.");
  const admin = createSupabaseAdminClient();
  const { data: existing, error } = await admin.from("grant_requirements").select("id").eq("grant_id", grantId);
  if (error) throw new AppError("DATABASE", "Unable to load requirements.", error);
  const existingIds = new Set(existing.map((requirement) => requirement.id));
  if (orderedRequirementIds.length !== existingIds.size) {
    throw new AppError("VALIDATION", "The requirement order is invalid.");
  }
  const unique = [...new Set(orderedRequirementIds)];
  if (unique.length !== existingIds.size || !unique.every((id) => existingIds.has(id))) {
    throw new AppError("VALIDATION", "The requirement order is invalid.");
  }
  await Promise.all(unique.map((requirementId, index) =>
    admin.from("grant_requirements").update({ display_order: index }).eq("id", requirementId).eq("grant_id", grantId),
  ));
  await recordAuditEvent({ actorId, action: "GRANT_REQUIREMENTS_REORDERED", entityType: "grant", entityId: grantId, metadata: { count: unique.length } });
  return { reordered: unique.length };
}

export async function saveGrantRequirement(grantId: string, input: unknown, requirementId?: string) { const data = grantRequirementContractSchema.parse(input); const admin = createSupabaseAdminClient(); const { data: grant, error } = await admin.from("grants").select("municipality_id, status").eq("id", grantId).maybeSingle(); if (error) throw new AppError("DATABASE", "Unable to load grant.", error); if (!grant) throw new AppError("NOT_FOUND", "Grant not found."); const actor = await requireMunicipalityAccess(grant.municipality_id); if (grant.status !== "DRAFT") throw new AppError("AUTHORIZATION", "Requirements can only be changed on draft grants."); const payload = { grant_id: grantId, name: data.name, description: data.description, type: data.type, is_required: data.isRequired, configuration: data.configuration, display_order: data.displayOrder }; const response = requirementId ? await admin.from("grant_requirements").update(payload).eq("id", requirementId).eq("grant_id", grantId).select().single() : await admin.from("grant_requirements").insert(payload).select().single(); if (response.error) throw new AppError("DATABASE", "Unable to save requirement.", response.error); await recordAuditEvent({ actorId: actor.id, action: requirementId ? "GRANT_REQUIREMENT_UPDATED" : "GRANT_REQUIREMENT_CREATED", entityType: "grant_requirement", entityId: response.data.id }); return response.data; }

export async function deleteGrantRequirement(grantId: string, requirementId: string) { const admin = createSupabaseAdminClient(); const { data: grant, error } = await admin.from("grants").select("municipality_id, status").eq("id", grantId).maybeSingle(); if (error) throw new AppError("DATABASE", "Unable to load grant.", error); if (!grant) throw new AppError("NOT_FOUND", "Grant not found."); const actor = await requireMunicipalityAccess(grant.municipality_id); if (grant.status !== "DRAFT") throw new AppError("AUTHORIZATION", "Requirements can only be changed on draft grants."); const { error: deleteError, count } = await admin.from("grant_requirements").delete({ count: "exact" }).eq("id", requirementId).eq("grant_id", grantId); if (deleteError) throw new AppError("DATABASE", "Unable to remove requirement.", deleteError); if (!count) throw new AppError("NOT_FOUND", "Requirement not found."); await recordAuditEvent({ actorId: actor.id, action: "GRANT_REQUIREMENT_DELETED", entityType: "grant_requirement", entityId: requirementId }); }
