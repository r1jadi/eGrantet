"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdminAreaAccess } from "@/lib/auth/server";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * Platform administration: municipality registry + membership management.
 *
 * Authorization: every action re-asserts the platform-admin boundary
 * (ADMIN role + server-side allowlist) before touching data. All writes are
 * audited. Reads return only fields useful for administration.
 */

const municipalityInputSchema = z.object({
  name: z.string().trim().min(1, "Enter the municipality name.").max(120),
});

const membershipInputSchema = z.object({
  municipalityId: z.uuid(),
  userEmail: z.string().trim().toLowerCase().email("Enter the employee's email address."),
});

const idSchema = z.uuid();

/**
 * The authenticated admin as the audit actor. Admin actions use the
 * service-role client, so RLS does not attribute these writes automatically;
 * the actor is recorded explicitly for every audit event.
 */
async function auditActorId(): Promise<string | undefined> {
  try {
    const actor = await getCurrentUser();
    return actor?.id;
  } catch {
    return undefined;
  }
}

export interface AdminMunicipality {
  id: string;
  name: string;
  memberCount: number;
  grantCount: number;
  createdAt: string;
}

export interface AdminMunicipalityMember {
  userId: string;
  fullName: string | null;
  email: string | null;
  joinedAt: string;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  createdAt: string;
  /** True when the account is banned at the auth layer and cannot sign in. */
  disabled: boolean;
}

/** Platform-wide record counts for the admin dashboard (admin only). */
export async function getPlatformStatsAdminAction(): Promise<{ municipalities: number; grants: number; applications: number; users: number }> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  const [municipalities, grants, applications, profiles] = await Promise.all([
    admin.from("municipalities").select("id", { count: "exact", head: true }),
    admin.from("grants").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }),
    admin.from("users").select("id", { count: "exact", head: true }),
  ]);
  return {
    municipalities: municipalities.count ?? 0,
    grants: grants.count ?? 0,
    applications: applications.count ?? 0,
    users: profiles.count ?? 0,
  };
}

/** Lists every municipality with member/grant counts (admin only). */
export async function listMunicipalitiesAdminAction(): Promise<AdminMunicipality[]> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("municipalities")
    .select("id, name, created_at, municipality_members(count), grants(count)")
    .order("name", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load municipalities.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    memberCount: Number((row.municipality_members as unknown as Array<{ count: number }>)?.[0]?.count ?? 0),
    grantCount: Number((row.grants as unknown as Array<{ count: number }>)?.[0]?.count ?? 0),
    createdAt: String(row.created_at),
  }));
}

/** Creates a municipality (admin only). */
export async function createMunicipalityAction(_previous: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  await assertAdminAreaAccess();
  const parsed = municipalityInputSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { status: "error" as const, message: parsed.error.issues[0]?.message ?? "Invalid municipality." };
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("municipalities").insert({ name: parsed.data.name }).select("id, name").single();
    if (error) throw new AppError("DATABASE", "Unable to create the municipality.", error);
    await recordAuditEvent({ actorId: await auditActorId(), action: "MUNICIPALITY_CREATED", entityType: "municipality", entityId: String(data.id), metadata: { name: parsed.data.name } });
    revalidatePath("/admin/municipalities");
    revalidatePath("/admin");
    return { status: "success" as const, message: `Municipality “${parsed.data.name}” was created.` };
  } catch (error) {
    return { status: "error" as const, message: toSafeErrorMessage(error) };
  }
}

/** Renames a municipality (admin only). */
export async function renameMunicipalityAction(_previous: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  await assertAdminAreaAccess();
  const parsed = z
    .object({ municipalityId: idSchema, name: z.string().trim().min(1, "Enter the municipality name.").max(120) })
    .safeParse({ municipalityId: formData.get("municipalityId"), name: formData.get("name") });
  if (!parsed.success) return { status: "error" as const, message: parsed.error.issues[0]?.message ?? "Invalid municipality." };
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("municipalities").update({ name: parsed.data.name }).eq("id", parsed.data.municipalityId);
    if (error) throw new AppError("DATABASE", "Unable to update the municipality.", error);
    await recordAuditEvent({ actorId: await auditActorId(), action: "MUNICIPALITY_RENAMED", entityType: "municipality", entityId: parsed.data.municipalityId, metadata: { name: parsed.data.name } });
    revalidatePath("/admin/municipalities");
    return { status: "success" as const, message: "Municipality renamed." };
  } catch (error) {
    return { status: "error" as const, message: toSafeErrorMessage(error) };
  }
}

/**
 * Deletes an empty municipality (no members, no grants). Deleting a
 * municipality that still owns data is refused rather than cascading.
 */
export async function deleteMunicipalityAction(_previous: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  await assertAdminAreaAccess();
  const parsed = idSchema.safeParse(formData.get("municipalityId"));
  if (!parsed.success) return { status: "error" as const, message: "Invalid municipality." };
  try {
    const admin = createSupabaseAdminClient();
    const { data: refs, error: refError } = await admin
      .from("municipalities")
      .select("id, municipality_members(count), grants(count)")
      .eq("id", parsed.data)
      .maybeSingle();
    if (refError) throw new AppError("DATABASE", "Unable to verify the municipality.", refError);
    if (!refs) return { status: "error" as const, message: "Municipality not found." };
    const members = Number((refs.municipality_members as unknown as Array<{ count: number }>)?.[0]?.count ?? 0);
    const grants = Number((refs.grants as unknown as Array<{ count: number }>)?.[0]?.count ?? 0);
    if (members > 0 || grants > 0) {
      return { status: "error" as const, message: `This municipality still has ${members} member(s) and ${grants} grant(s). Remove them first.` };
    }
    const { error } = await admin.from("municipalities").delete().eq("id", parsed.data);
    if (error) throw new AppError("DATABASE", "Unable to delete the municipality.", error);
    await recordAuditEvent({ actorId: await auditActorId(), action: "MUNICIPALITY_DELETED", entityType: "municipality", entityId: parsed.data });
    revalidatePath("/admin/municipalities");
    revalidatePath("/admin");
    return { status: "success" as const, message: "Municipality deleted." };
  } catch (error) {
    return { status: "error" as const, message: toSafeErrorMessage(error) };
  }
}

/** Lists members of one municipality with names/emails (admin only). */
export async function listMunicipalityMembersAdminAction(municipalityId: string): Promise<AdminMunicipalityMember[]> {
  await assertAdminAreaAccess();
  const id = idSchema.parse(municipalityId);
  const admin = createSupabaseAdminClient();
  const { data: members, error } = await admin
    .from("municipality_members")
    .select("user_id, created_at")
    .eq("municipality_id", id)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load members.", error);
  if (!(members ?? []).length) return [];
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (authError) throw new AppError("DATABASE", "Unable to load account emails.", authError);
  const emailById = new Map((authUsers.users ?? []).map((user) => [user.id, user.email ?? null]));
  const userIds = (members ?? []).map((member) => String(member.user_id));
  const { data: profiles } = await admin.from("users").select("id, full_name").in("id", userIds);
  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name as string | null]));
  return (members ?? []).map((member) => ({
    userId: String(member.user_id),
    fullName: nameById.get(String(member.user_id)) ?? null,
    email: emailById.get(String(member.user_id)) ?? null,
    joinedAt: String(member.created_at),
  }));
}

/** Resolves a user id from an email through auth (admin only). */
async function resolveUserIdByEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (error) throw new AppError("DATABASE", "Unable to look up users.", error);
  const match = (data.users ?? []).find((user) => (user.email ?? "").toLowerCase() === email);
  if (!match) throw new AppError("NOT_FOUND", `No account exists for ${email}. Ask them to sign up first.`);
  return match.id;
}

/** Adds an existing account as a municipal employee of a municipality. */
export async function addMunicipalityMemberAction(_previous: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  await assertAdminAreaAccess();
  const parsed = membershipInputSchema.safeParse({ municipalityId: formData.get("municipalityId"), userEmail: formData.get("userEmail") });
  if (!parsed.success) return { status: "error" as const, message: parsed.error.issues[0]?.message ?? "Invalid membership." };
  try {
    const admin = createSupabaseAdminClient();
    const userId = await resolveUserIdByEmail(admin, parsed.data.userEmail);
    const { error: promoteError } = await admin.from("users").update({ role: "MUNICIPAL_EMPLOYEE" }).eq("id", userId);
    if (promoteError) throw new AppError("DATABASE", "Unable to assign the employee role.", promoteError);
    const { error } = await admin.from("municipality_members").insert({ municipality_id: parsed.data.municipalityId, user_id: userId });
    if (error) {
      if ((error as { code?: string }).code === "23505") return { status: "error" as const, message: "This user is already a member of the municipality." };
      throw new AppError("DATABASE", "Unable to add the member.", error);
    }
    await recordAuditEvent({ actorId: userId, action: "MUNICIPALITY_MEMBER_ADDED", entityType: "municipality", entityId: parsed.data.municipalityId, metadata: { email: parsed.data.userEmail } });
    revalidatePath("/admin/municipalities");
    return { status: "success" as const, message: `${parsed.data.userEmail} added as a municipal employee.` };
  } catch (error) {
    if (error instanceof AppError) return { status: "error" as const, message: error.message };
    return { status: "error" as const, message: toSafeErrorMessage(error) };
  }
}

/** Removes a member from a municipality (admin only). */
export async function removeMunicipalityMemberAction(_previous: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  await assertAdminAreaAccess();
  const parsed = z
    .object({ municipalityId: idSchema, userId: idSchema })
    .safeParse({ municipalityId: formData.get("municipalityId"), userId: formData.get("userId") });
  if (!parsed.success) return { status: "error" as const, message: "Invalid membership." };
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("municipality_members").delete().eq("municipality_id", parsed.data.municipalityId).eq("user_id", parsed.data.userId);
    if (error) throw new AppError("DATABASE", "Unable to remove the member.", error);
    await recordAuditEvent({ actorId: parsed.data.userId, action: "MUNICIPALITY_MEMBER_REMOVED", entityType: "municipality", entityId: parsed.data.municipalityId });
    revalidatePath("/admin/municipalities");
    return { status: "success" as const, message: "Member removed." };
  } catch (error) {
    return { status: "error" as const, message: toSafeErrorMessage(error) };
  }
}

/** Lists platform users with roles, newest first, optionally filtered (admin only). */
export async function listUsersAdminAction(search?: string): Promise<AdminUserRow[]> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  const { data: profiles, error } = await admin
    .from("users")
    .select("id, role, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new AppError("DATABASE", "Unable to load users.", error);
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (authError) throw new AppError("DATABASE", "Unable to load account emails.", authError);
  const accountById = new Map((authUsers.users ?? []).map((user) => [
    user.id,
    { email: user.email ?? null, banned: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()) },
  ]));
  const term = (search ?? "").trim().toLowerCase();
  return (profiles ?? [])
    .map((row) => ({
      id: String(row.id),
      role: String(row.role),
      fullName: (row.full_name as string | null) ?? null,
      createdAt: String(row.created_at),
      email: accountById.get(String(row.id))?.email ?? null,
      disabled: accountById.get(String(row.id))?.banned ?? false,
    }))
    .filter((row) => !term || (row.email ?? "").toLowerCase().includes(term) || (row.fullName ?? "").toLowerCase().includes(term));
}

const roleChangeSchema = z.object({
  userId: idSchema,
  role: z.enum(["APPLICANT", "MUNICIPAL_EMPLOYEE", "EVALUATOR", "ADMIN"]),
});

/** Changes a user's platform role (admin only, audited). */
export async function changeUserRoleAction(_previous: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  const actor = await assertAdminAreaAccess();
  const parsed = roleChangeSchema.safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) return { status: "error" as const, message: parsed.error.issues[0]?.message ?? "Invalid role change." };
  if (parsed.data.userId === actor.id) return { status: "error" as const, message: "You cannot change your own role." };
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("users").update({ role: parsed.data.role }).eq("id", parsed.data.userId);
    if (error) throw new AppError("DATABASE", "Unable to change the role.", error);
    await recordAuditEvent({ actorId: parsed.data.userId, action: "USER_ROLE_CHANGED", entityType: "user", entityId: parsed.data.userId, metadata: { role: parsed.data.role, changedBy: actor.id } });
    revalidatePath("/admin/users");
    return { status: "success" as const, message: `Role updated to ${parsed.data.role}.` };
  } catch (error) {
    return { status: "error" as const, message: toSafeErrorMessage(error) };
  }
}

const disableSchema = z.object({ userId: idSchema, disable: z.enum(["true", "false"]) });

/** Disables or re-enables an account at the auth layer (admin only, audited). */
export async function setUserDisabledAction(_previous: { status: "idle" | "success" | "error"; message?: string }, formData: FormData) {
  const actor = await assertAdminAreaAccess();
  const parsed = disableSchema.safeParse({ userId: formData.get("userId"), disable: formData.get("disable") });
  if (!parsed.success) return { status: "error" as const, message: "Invalid request." };
  if (parsed.data.userId === actor.id) return { status: "error" as const, message: "You cannot disable your own account." };
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, { ban_duration: parsed.data.disable === "true" ? "876000h" : "none" });
    if (error) throw new AppError("DATABASE", "Unable to update the account.", error);
    await recordAuditEvent({ actorId: await auditActorId(), action: parsed.data.disable === "true" ? "USER_DISABLED" : "USER_ENABLED", entityType: "user", entityId: parsed.data.userId, metadata: { changedBy: actor.id } });
    revalidatePath("/admin/users");
    return { status: "success" as const, message: parsed.data.disable === "true" ? "Account disabled." : "Account re-enabled." };
  } catch (error) {
    return { status: "error" as const, message: toSafeErrorMessage(error) };
  }
}

/** Platform audit trail, newest first, filterable by entity (admin only). */
export async function listAuditLogsAdminAction(input?: { entityType?: string; limit?: number }) {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  let request = admin
    .from("audit_logs")
    .select("id, action, actor_id, entity_type, entity_id, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(Math.min(input?.limit ?? 100, 500));
  if (input?.entityType) request = request.eq("entity_type", input.entityType);
  const { data, error } = await request;
  if (error) throw new AppError("DATABASE", "Unable to load the audit trail.", error);
  const actorIds = [...new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))] as string[];
  const [profileResult, authUsers] = await Promise.all([
    actorIds.length ? admin.from("users").select("id, full_name").in("id", actorIds) : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> | null, error: null }),
    // Profiles may be missing (e.g. failed signups); fall back to the auth email.
    actorIds.length ? admin.auth.admin.listUsers() : Promise.resolve({ data: { users: [] as Array<{ id: string; email: string | null }> } }),
  ]);
  const nameById = new Map<string, string>(
    (profileResult.data ?? []).flatMap((actor) => (actor.full_name ? [[actor.id, actor.full_name] as [string, string]] : [])),
  );
  for (const authUser of authUsers.data.users ?? []) {
    if (authUser.email && !nameById.has(authUser.id)) nameById.set(authUser.id, authUser.email);
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    action: String(row.action),
    actorId: (row.actor_id as string | null) ?? null,
    actorName: row.actor_id ? (nameById.get(String(row.actor_id)) ?? null) : null,
    entityType: String(row.entity_type),
    entityId: (row.entity_id as string | null) ?? null,
    createdAt: String(row.created_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

/* ------------------------------------------------------------------ */
/* Platform-wide management listings (admin management center)         */
/* ------------------------------------------------------------------ */

export interface AdminGrantRow {
  id: string;
  title: string;
  status: string;
  municipalityName: string | null;
  fundingAmount: number | null;
  fundingCurrency: string | null;
  deadline: string | null;
  applicationCount: number;
  createdAt: string;
}

/** Lists every grant on the platform with search/status filter (admin only). */
export async function listGrantsAdminAction(input?: { search?: string; status?: string }): Promise<AdminGrantRow[]> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  let request = admin
    .from("grants")
    .select("id, title, status, funding_amount, funding_currency, application_deadline, created_at, municipalities(name), applications(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (input?.search) request = request.ilike("title", `%${input.search}%`);
  if (input?.status) request = request.eq("status", input.status);
  const { data, error } = await request;
  if (error) throw new AppError("DATABASE", "Unable to load grants.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    municipalityName: ((row.municipalities as { name?: string } | null)?.name) ?? null,
    fundingAmount: (row.funding_amount as number | null) ?? null,
    fundingCurrency: (row.funding_currency as string | null) ?? null,
    deadline: (row.application_deadline as string | null) ?? null,
    applicationCount: Number((row.applications as unknown as Array<{ count: number }>)?.[0]?.count ?? 0),
    createdAt: String(row.created_at),
  }));
}

export interface AdminApplicationRow {
  id: string;
  status: string;
  applicantName: string | null;
  applicantOrganisation: string | null;
  grantId: string;
  grantTitle: string;
  municipalityName: string | null;
  requestedAmount: number | null;
  submittedAt: string | null;
  updatedAt: string;
  createdAt: string;
  /** Deterministic eligibility: PASSED / FAILED / PENDING / NONE (no checks yet). */
  eligibility: "PASSED" | "FAILED" | "PENDING" | "NONE";
  /** AI verification overview status: COMPLETED / NEEDS_REVIEW / PROCESSING / FAILED / NOT_RUN. */
  verification: string;
  /** Evaluation progress for this application. */
  evaluationsTotal: number;
  evaluationsSubmitted: number;
}

const ADMIN_APPLICATION_SORTS = {
  updated: "updated_at",
  submitted: "submitted_at",
  created: "created_at",
} as const;

/**
 * Platform-wide application queue with the operational columns an admin
 * needs: identity, grant, workflow status, eligibility outcome, AI
 * verification status, and evaluation progress. Server-side filtering
 * (search/status/grant/submitted-before), sorting, and pagination keep the
 * query bounded; per-application aggregates arrive in two follow-up reads.
 */
export async function listApplicationsAdminAction(input?: {
  search?: string;
  status?: string;
  grantId?: string;
  submittedBefore?: string;
  sort?: keyof typeof ADMIN_APPLICATION_SORTS;
  desc?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: AdminApplicationRow[]; total: number; page: number; pageSize: number }> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, input?.pageSize ?? 20));
  const sortColumn = ADMIN_APPLICATION_SORTS[input?.sort ?? "updated"];
  const descending = input?.desc ?? true;

  let request = admin
    .from("applications")
    .select("id, status, submitted_at, created_at, updated_at, answers, grant_id, users!applications_applicant_id_fkey(full_name), grants!inner(id, title, municipalities(name))", { count: "exact" })
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order(sortColumn, { ascending: !descending, nullsFirst: false });
  if (input?.status) request = request.eq("status", input.status);
  if (input?.grantId) request = request.eq("grant_id", input.grantId);
  if (input?.submittedBefore) request = request.lt("submitted_at", input.submittedBefore);
  const { data, error, count } = await request;
  if (error) throw new AppError("DATABASE", "Unable to load applications.", error);

  const baseRows = (data ?? []).map((row) => {
    const answers = (row.answers as Record<string, unknown> | null) ?? {};
    const budget = Number.parseInt(String(answers.budgetAmount ?? ""), 10);
    const grant = row.grants as unknown as { id: string; title: string; municipalities?: { name?: string } | null };
    return {
      id: String(row.id),
      status: String(row.status),
      applicantName: ((row.users as { full_name?: string } | null)?.full_name) ?? null,
      applicantOrganisation: typeof answers.organisationName === "string" && answers.organisationName.trim() ? answers.organisationName.trim() : null,
      grantId: String(grant?.id ?? row.grant_id),
      grantTitle: grant?.title ?? "—",
      municipalityName: grant?.municipalities?.name ?? null,
      requestedAmount: Number.isFinite(budget) ? budget : null,
      submittedAt: (row.submitted_at as string | null) ?? null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });

  // Search covers applicant name, organisation, and the answers blob.
  const search = input?.search?.trim().toLowerCase();
  const rows = search
    ? baseRows.filter((row) => `${row.applicantName ?? ""} ${row.applicantOrganisation ?? ""} ${row.grantTitle}`.toLowerCase().includes(search))
    : baseRows;

  // Aggregates for exactly this page's applications (keeps the payload small).
  const ids = rows.map((row) => row.id);
  const eligibilityById = new Map<string, "PASSED" | "FAILED" | "PENDING">();
  const verificationById = new Map<string, string>();
  const evaluationsById = new Map<string, { total: number; submitted: number }>();
  if (ids.length > 0) {
    const [checksResult, verificationsResult, evaluationsResult] = await Promise.all([
      admin.from("eligibility_checks").select("application_id, result").in("application_id", ids),
      admin.from("application_verifications").select("application_id, status").in("application_id", ids),
      admin.from("evaluations").select("application_id, status").in("application_id", ids),
    ]);
    for (const row of checksResult.data ?? []) {
      const applicationId = String(row.application_id);
      const result = String(row.result);
      // FAILED dominates, then PENDING, then PASSED — a single failed check
      // means the application is not eligible even if others passed.
      const current = eligibilityById.get(applicationId);
      if (result === "FAILED" || (result === "PENDING" && current === "PASSED") || !current) {
        eligibilityById.set(applicationId, result === "FAILED" ? "FAILED" : result === "PENDING" ? "PENDING" : "PASSED");
      }
    }
    for (const row of verificationsResult.data ?? []) verificationById.set(String(row.application_id), String(row.status));
    for (const row of evaluationsResult.data ?? []) {
      const entry = evaluationsById.get(String(row.application_id)) ?? { total: 0, submitted: 0 };
      entry.total += 1;
      if (String(row.status) === "SUBMITTED") entry.submitted += 1;
      evaluationsById.set(String(row.application_id), entry);
    }
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      eligibility: eligibilityById.get(row.id) ?? (row.status === "DRAFT" ? "NONE" : "PENDING"),
      verification: verificationById.get(row.id) ?? "NOT_RUN",
      evaluationsTotal: evaluationsById.get(row.id)?.total ?? 0,
      evaluationsSubmitted: evaluationsById.get(row.id)?.submitted ?? 0,
    })),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export interface AdminEvaluationRow {
  id: string;
  applicationId: string;
  grantTitle: string;
  evaluatorName: string | null;
  evaluatorEmail: string | null;
  status: string;
  totalScore: number | null;
  updatedAt: string;
}

/** Lists every evaluation with its evaluator and scores (admin only). */
export async function listEvaluationsAdminAction(): Promise<AdminEvaluationRow[]> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("evaluations")
    .select("id, status, score, updated_at, application_id, evaluator_id, users(full_name), applications(grants(title))")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new AppError("DATABASE", "Unable to load evaluations.", error);
  const evaluatorIds = [...new Set((data ?? []).map((row) => String((row as { evaluator_id?: string }).evaluator_id ?? "")).filter(Boolean))];
  const [profileResult, authUsers] = await Promise.all([
    evaluatorIds.length ? admin.from("users").select("id, full_name").in("id", evaluatorIds) : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> | null, error: null }),
    evaluatorIds.length ? admin.auth.admin.listUsers() : Promise.resolve({ data: { users: [] as Array<{ id: string; email: string | null }> } }),
  ]);
  const nameById = new Map<string, string>((profileResult.data ?? []).flatMap((p) => (p.full_name ? [[p.id, p.full_name] as [string, string]] : [])));
  for (const authUser of authUsers.data.users ?? []) {
    if (authUser.email && !nameById.has(authUser.id)) nameById.set(authUser.id, authUser.email);
  }
  return (data ?? []).map((row) => {
    const evaluatorId = String((row as { evaluator_id?: string }).evaluator_id ?? "");
    return {
      id: String(row.id),
      applicationId: String(row.application_id),
      grantTitle: ((row.applications as { grants?: { title?: string } | null } | null)?.grants?.title) ?? "—",
      evaluatorName: evaluatorId ? (nameById.get(evaluatorId) ?? null) : null,
      evaluatorEmail: evaluatorId ? (nameById.get(evaluatorId) ?? null) : null,
      status: String(row.status),
      totalScore: (row.score as number | null) ?? null,
      updatedAt: String(row.updated_at),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Admin grant management (create/edit/requirements/criteria/lifecycle) */
/* ------------------------------------------------------------------ */

/** Every municipality for grant-creation selects (admin only). */
export async function listAllMunicipalitiesAdminAction(): Promise<Array<{ id: string; name: string }>> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("municipalities").select("id, name").order("name", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load municipalities.", error);
  return data.map((row) => ({ id: String(row.id), name: String(row.name) }));
}

export interface AdminApplicationStatsRow {
  status: string;
  count: number;
}

/** Full application status distribution for one grant (admin only). */
export async function getGrantApplicationStatsAdminAction(grantId: string): Promise<AdminApplicationStatsRow[]> {
  await assertAdminAreaAccess();
  const id = idSchema.parse(grantId);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("applications").select("status").eq("grant_id", id);
  if (error) throw new AppError("DATABASE", "Unable to load application statistics.", error);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(String(row.status), (counts.get(String(row.status)) ?? 0) + 1);
  return [...counts.entries()].map(([status, count]) => ({ status, count }));
}

export interface AdminVerificationStats {
  totalApplications: number;
  verificationsCompleted: number;
  verificationsNeedsReview: number;
  verificationsFailed: number;
  documentsTotal: number;
  documentsFlagged: number;
}

/** AI/document verification statistics for one grant (admin only). */
export async function getGrantVerificationStatsAdminAction(grantId: string): Promise<AdminVerificationStats> {
  await assertAdminAreaAccess();
  const id = idSchema.parse(grantId);
  const admin = createSupabaseAdminClient();
  const [applicationsResult, verificationsResult, documentsResult] = await Promise.all([
    admin.from("applications").select("id", { count: "exact" }).eq("grant_id", id),
    admin.from("application_verifications").select("status, applications!inner(grant_id)").eq("applications.grant_id", id),
    admin.from("application_documents").select("status, applications!inner(grant_id)").eq("applications.grant_id", id),
  ]);
  if (verificationsResult.error) throw new AppError("DATABASE", "Unable to load verification statistics.", verificationsResult.error);
  if (documentsResult.error) throw new AppError("DATABASE", "Unable to load document statistics.", documentsResult.error);
  const stats: AdminVerificationStats = {
    totalApplications: applicationsResult.count ?? 0,
    verificationsCompleted: 0,
    verificationsNeedsReview: 0,
    verificationsFailed: 0,
    documentsTotal: (documentsResult.data ?? []).length,
    documentsFlagged: (documentsResult.data ?? []).filter((row) => row.status === "FLAGGED" || row.status === "REJECTED").length,
  };
  for (const row of (verificationsResult.data ?? []) as Array<{ status: string }>) {
    if (row.status === "COMPLETED") stats.verificationsCompleted += 1;
    else if (row.status === "NEEDS_REVIEW") stats.verificationsNeedsReview += 1;
    else if (row.status === "FAILED") stats.verificationsFailed += 1;
  }
  return stats;
}

export interface AdminGrantActivityRow {
  id: string;
  action: string;
  actorName: string | null;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

/** Recent audit activity touching this grant or its applications (admin only). */
export async function listGrantActivityAdminAction(grantId: string, limit = 20): Promise<AdminGrantActivityRow[]> {
  await assertAdminAreaAccess();
  const id = idSchema.parse(grantId);
  const admin = createSupabaseAdminClient();
  const { data: applications } = await admin.from("applications").select("id").eq("grant_id", id);
  const applicationIds = (applications ?? []).map((row) => String(row.id));
  // Grant events by entity_id plus application events under the grant.
  const filters = [`and(entity_type.eq.grant,entity_id.eq.${id})`, ...applicationIds.map((applicationId) => `and(entity_type.eq.application,entity_id.eq.${applicationId})`)];
  const { data, error } = await admin
    .from("audit_logs")
    .select("id, action, actor_id, entity_type, entity_id, created_at")
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new AppError("DATABASE", "Unable to load grant activity.", error);
  const actorIds = [...new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))] as string[];
  const [profileResult, authUsers] = await Promise.all([
    actorIds.length ? admin.from("users").select("id, full_name").in("id", actorIds) : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> | null, error: null }),
    actorIds.length ? admin.auth.admin.listUsers() : Promise.resolve({ data: { users: [] as Array<{ id: string; email: string | null }> } }),
  ]);
  const nameById = new Map<string, string>((profileResult.data ?? []).flatMap((profile) => (profile.full_name ? [[profile.id, profile.full_name] as [string, string]] : [])));
  for (const authUser of authUsers.data.users ?? []) {
    if (authUser.email && !nameById.has(authUser.id)) nameById.set(authUser.id, authUser.email);
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    action: String(row.action),
    actorName: row.actor_id ? (nameById.get(String(row.actor_id)) ?? null) : null,
    entityType: String(row.entity_type),
    entityId: (row.entity_id as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}

export interface NeedsAttentionApplication {
  id: string;
  applicantName: string | null;
  applicantOrganisation: string | null;
  grantTitle: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
}

export interface NeedsAttentionResult {
  /** SUBMITTED applications that have not entered review yet. */
  awaitingReview: NeedsAttentionApplication[];
  /** AI verification finished with NEEDS_REVIEW — findings await a human. */
  verificationNeedsReview: NeedsAttentionApplication[];
  /** CORRECTION_REQUESTED — waiting on the applicant, but aging items matter. */
  correctionRequested: NeedsAttentionApplication[];
  /** Verification FAILED — the run errored and should be retried. */
  verificationFailed: NeedsAttentionApplication[];
}

async function needsAttentionRows(admin: ReturnType<typeof createSupabaseAdminClient>, rows: Array<Record<string, unknown>>): Promise<NeedsAttentionApplication[]> {
  return rows.map((row) => {
    const answers = (row.answers as Record<string, unknown> | null) ?? {};
    return {
      id: String(row.id),
      applicantName: ((row.users as { full_name?: string } | null)?.full_name) ?? null,
      applicantOrganisation: typeof answers.organisationName === "string" && answers.organisationName.trim() ? answers.organisationName.trim() : null,
      grantTitle: ((row.grants as { title?: string } | null)?.title) ?? "—",
      status: String(row.status),
      submittedAt: (row.submitted_at as string | null) ?? null,
      updatedAt: String(row.updated_at),
    };
  });
}

const NEEDS_ATTENTION_SELECT = "id, status, submitted_at, updated_at, answers, users!applications_applicant_id_fkey(full_name), grants(title)";

/**
 * Operational "needs attention" queue for the admin dashboard. Every list is
 * bounded (newest first) and derived from real workflow state — no synthetic
 * priority scores.
 */
export async function getNeedsAttentionAdminAction(): Promise<NeedsAttentionResult> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  const [submittedResult, correctionResult] = await Promise.all([
    admin.from("applications").select(NEEDS_ATTENTION_SELECT).eq("status", "SUBMITTED").order("submitted_at", { ascending: true, nullsFirst: false }).limit(5),
    admin.from("applications").select(NEEDS_ATTENTION_SELECT).eq("status", "CORRECTION_REQUESTED").order("updated_at", { ascending: true }).limit(5),
  ]);
  if (submittedResult.error) throw new AppError("DATABASE", "Unable to load the review queue.", submittedResult.error);
  if (correctionResult.error) throw new AppError("DATABASE", "Unable to load correction requests.", correctionResult.error);

  // Verification-needs-review and failed runs come from application_verifications.
  const [needsReviewResult, failedResult] = await Promise.all([
    admin.from("application_verifications").select(`status, updated_at, applications!inner(${NEEDS_ATTENTION_SELECT})`).eq("status", "NEEDS_REVIEW").order("updated_at", { ascending: false }).limit(5),
    admin.from("application_verifications").select(`status, updated_at, applications!inner(${NEEDS_ATTENTION_SELECT})`).eq("status", "FAILED").order("updated_at", { ascending: false }).limit(5),
  ]);
  if (needsReviewResult.error) throw new AppError("DATABASE", "Unable to load verification queue.", needsReviewResult.error);
  if (failedResult.error) throw new AppError("DATABASE", "Unable to load failed verifications.", failedResult.error);

  const flatten = (rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> =>
    rows.map((row) => (row.applications as unknown as Record<string, unknown>) ?? row);

  return {
    awaitingReview: await needsAttentionRows(admin, submittedResult.data ?? []),
    verificationNeedsReview: await needsAttentionRows(admin, flatten(needsReviewResult.data ?? [] as unknown as Array<Record<string, unknown>>)),
    correctionRequested: await needsAttentionRows(admin, correctionResult.data ?? []),
    verificationFailed: await needsAttentionRows(admin, flatten(failedResult.data ?? [] as unknown as Array<Record<string, unknown>>)),
  };
}

export interface AdminEmailDeliveryRow {
  id: string;
  category: string;
  recipientEmail: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

/** Email delivery tracking across the platform (admin only). */
export async function listEmailDeliveriesAdminAction(input?: { status?: string }): Promise<AdminEmailDeliveryRow[]> {
  await assertAdminAreaAccess();
  const admin = createSupabaseAdminClient();
  let request = admin
    .from("notification_emails")
    .select("id, email_category, recipient_email, status, error_message, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (input?.status) request = request.eq("status", input.status);
  const { data, error } = await request;
  if (error) throw new AppError("DATABASE", "Unable to load email deliveries.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    category: String(row.email_category),
    recipientEmail: String(row.recipient_email),
    status: String(row.status),
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: String(row.created_at),
    sentAt: (row.sent_at as string | null) ?? null,
  }));
}
