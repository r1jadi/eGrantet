import "server-only";
import { redirect } from "next/navigation";
import { getCurrentMunicipalityMemberships, requireMunicipalityAccess } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "../types";
import type { MunicipalApplicationCheck, MunicipalApplicationDetail, MunicipalApplicationDocument, MunicipalApplicationListItem, MunicipalApplicationStats } from "../types";

/** Statuses that make up the municipal review queue (everything past drafting). */
const REVIEW_QUEUE_STATUSES: ApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED", "APPROVED", "REJECTED"];

const numeric = (value: unknown): number | null => (typeof value === "number" ? value : null);

function flattenListRow(row: Record<string, unknown>): MunicipalApplicationListItem {
  const grants = row.grants as { id: string; title: string; funding_amount: number | null; funding_currency: string | null } | null;
  const users = row.users as { id: string; full_name: string | null } | null;
  const answers = (row.answers as Record<string, unknown> | null) ?? {};
  return {
    id: String(row.id),
    status: row.status as ApplicationStatus,
    submittedAt: (row.submitted_at as string | null) ?? null,
    createdAt: String(row.created_at),
    grantId: grants?.id ?? String(row.grant_id),
    grantTitle: grants?.title ?? "Unknown grant",
    fundingAmount: numeric(grants?.funding_amount),
    fundingCurrency: grants?.funding_currency ?? null,
    applicantId: users?.id ?? String(row.applicant_id),
    applicantName: users?.full_name ?? "Unnamed applicant",
    applicantOrganisation: typeof answers.organisationName === "string" && answers.organisationName.trim() ? answers.organisationName.trim() : null,
  };
}

async function requireCurrentMunicipalityId(): Promise<string> {
  let memberships;
  try {
    memberships = await getCurrentMunicipalityMemberships();
  } catch (error) {
    // Unauthenticated or sessionless visitors are sent to sign-in instead of an error screen.
    if (error instanceof AppError && error.code === "AUTHENTICATION") redirect("/login");
    throw error;
  }
  if (memberships.length === 0) throw new AppError("AUTHORIZATION", "You are not a member of a municipality.");
  return memberships[0].municipalityId;
}

export async function getMunicipalApplicationStats(): Promise<MunicipalApplicationStats> {
  const municipalityId = await requireCurrentMunicipalityId();
  await requireMunicipalityAccess(municipalityId);
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("applications").select("status").in("status", REVIEW_QUEUE_STATUSES);
  if (error) throw new AppError("DATABASE", "Unable to load application statistics.", error);
  const stats: MunicipalApplicationStats = { total: 0, readyForReview: 0, inReview: 0, approved: 0, rejected: 0 };
  for (const row of data ?? []) {
    stats.total += 1;
    if (row.status === "SUBMITTED" || row.status === "CORRECTION_REQUESTED") stats.readyForReview += 1;
    else if (row.status === "UNDER_REVIEW") stats.inReview += 1;
    else if (row.status === "APPROVED") stats.approved += 1;
    else if (row.status === "REJECTED") stats.rejected += 1;
  }
  return stats;
}

export async function listMunicipalApplications(): Promise<MunicipalApplicationListItem[]> {
  const municipalityId = await requireCurrentMunicipalityId();
  await requireMunicipalityAccess(municipalityId);
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("applications")
    .select("id, status, submitted_at, created_at, grant_id, applicant_id, answers, grants!inner(id, title, funding_amount, funding_currency, municipality_id), users!applications_applicant_id_fkey(id, full_name)")
    .in("status", REVIEW_QUEUE_STATUSES)
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new AppError("DATABASE", "Unable to load applications.", error);
  return (data ?? []).map((row) => flattenListRow(row as Record<string, unknown>));
}

export async function getMunicipalApplicationDetail(applicationId: string): Promise<MunicipalApplicationDetail> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("applications")
    .select("id, applicant_id, status, submitted_at, created_at, updated_at, answers, grants!inner(id, title, funding_amount, funding_currency, application_deadline, status, municipality_id), users!applications_applicant_id_fkey(id, full_name)")
    .eq("id", applicationId)
    .in("status", REVIEW_QUEUE_STATUSES)
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the application.", error);
  if (!data) throw new AppError("NOT_FOUND", "Application not found.");
  const grant = data.grants as unknown as { id: string; title: string; funding_amount: number | null; funding_currency: string | null; application_deadline: string | null; status: string; municipality_id: string };
  await requireMunicipalityAccess(grant.municipality_id);
  const answers = (data.answers as Record<string, unknown> | null) ?? {};
  const contact = typeof answers.contactEmail === "string" ? answers.contactEmail : null;
  // The users embed is a left join: RLS may hide the applicant's profile row
  // from municipality employees, so fall back to the application's applicant_id.
  const applicantProfile = data.users as unknown as { id: string; full_name: string | null } | null;
  return {
    id: String(data.id),
    status: data.status as ApplicationStatus,
    submittedAt: (data.submitted_at as string | null) ?? null,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
    answers,
    grant: { id: grant.id, title: grant.title, fundingAmount: numeric(grant.funding_amount), fundingCurrency: grant.funding_currency, applicationDeadline: grant.application_deadline, status: grant.status },
    applicant: { id: applicantProfile?.id ?? String(data.applicant_id), fullName: applicantProfile?.full_name ?? null, organisation: typeof answers.organisationName === "string" && answers.organisationName.trim() ? answers.organisationName.trim() : null, email: contact },
  };
}

export async function listMunicipalApplicationDocuments(applicationId: string): Promise<MunicipalApplicationDocument[]> {
  const detail = await getMunicipalApplicationDetail(applicationId);
  void detail;
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("application_documents")
    .select("id, file_name, document_type, status, content_type, file_size_bytes, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load documents.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    fileName: String(row.file_name),
    documentType: String(row.document_type),
    status: row.status as MunicipalApplicationDocument["status"],
    contentType: String(row.content_type),
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    createdAt: String(row.created_at),
  }));
}

export async function listMunicipalApplicationChecks(applicationId: string): Promise<MunicipalApplicationCheck[]> {
  await getMunicipalApplicationDetail(applicationId);
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("eligibility_checks")
    .select("id, requirement_id, result, reason, checked_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load validation results.", error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    requirementId: (row.requirement_id as string | null) ?? null,
    result: row.result as MunicipalApplicationCheck["result"],
    reason: (row.reason as string | null) ?? null,
    checkedAt: (row.checked_at as string | null) ?? null,
  }));
}
