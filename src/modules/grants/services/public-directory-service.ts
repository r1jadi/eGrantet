import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveGrantDocumentRequirements, type GrantDocumentRequirement } from "../grant-document-requirements";
import type { DirectoryGrant } from "../components/grant-card";

/**
 * Public, applicant-facing grant loaders.
 *
 * These expose only PUBLISHED grants and only the fields applicants should
 * see. They complement the municipal management services (which enforce
 * membership) — no authorization is needed here because published grant data
 * is public by design, and no applicant-identifying data is returned.
 */

interface GrantDirectoryRow {
  id: string;
  title: string;
  description: string;
  funding_amount: number | null;
  funding_currency: string | null;
  application_deadline: string | null;
  municipalities: Array<{ name: string }> | { name: string } | null;
}

function municipalityNameOf(row: GrantDirectoryRow): string {
  const municipalities = row.municipalities;
  if (Array.isArray(municipalities)) return municipalities[0]?.name ?? "—";
  return municipalities?.name ?? "—";
}

function toDirectoryGrant(row: GrantDirectoryRow): DirectoryGrant {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.description.length > 180 ? `${row.description.slice(0, 177)}…` : row.description,
    municipalityName: municipalityNameOf(row),
    fundingAmount: row.funding_amount,
    fundingCurrency: row.funding_currency,
    applicationDeadline: row.application_deadline,
  };
}

/** All currently published grants, ordered by soonest deadline. */
export async function listPublicDirectoryGrants(): Promise<DirectoryGrant[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("grants")
    .select("id, title, description, funding_amount, funding_currency, application_deadline, municipalities(name)")
    .eq("status", "PUBLISHED")
    .order("application_deadline", { ascending: true });
  if (error) throw new AppError("DATABASE", "Unable to load the grants.", error);
  return (data ?? []).map((row) => toDirectoryGrant(row as unknown as GrantDirectoryRow));
}

export interface PublicGrantDetail {
  id: string;
  title: string;
  description: string;
  municipalityName: string;
  fundingAmount: number | null;
  fundingCurrency: string | null;
  applicationDeadline: string | null;
  applicationAvailable: boolean;
  requirements: Array<{ id: string; name: string; description: string; type: string; isRequired: boolean; configuration: { answerKey?: string } }>;
  /** The exact documents this grant requires/accepts, from its requirements. */
  documentRequirements: GrantDocumentRequirement[];
}

/** Public detail for one published grant, including its requirements. */
export async function getPublicDirectoryGrantDetail(grantId: string): Promise<PublicGrantDetail> {
  const { data, error } = await createSupabaseAdminClient()
    .from("grants")
    .select("id, title, description, funding_amount, funding_currency, application_deadline, municipalities(name), grant_requirements(id, name, description, type, is_required, configuration, display_order)")
    .eq("id", grantId)
    .eq("status", "PUBLISHED")
    .maybeSingle();
  if (error) throw new AppError("DATABASE", "Unable to load the grant.", error);
  if (!data) throw new AppError("NOT_FOUND", "Grant not found.");
  const row = data as unknown as GrantDirectoryRow & {
    grant_requirements: Array<{ id: string; name: string; description: string; type: string; is_required: boolean; configuration: unknown; display_order: number }> | null;
  };
  const requirements = (row.grant_requirements ?? [])
    .sort((left, right) => left.display_order - right.display_order)
    .map((requirement) => ({
      id: requirement.id,
      name: requirement.name,
      description: requirement.description,
      type: requirement.type,
      isRequired: requirement.is_required,
      // Applicants only need the storage key to answer a configured question.
      // Deliberately do not expose rule values such as expectedAnswer.
      configuration: typeof requirement.configuration === "object" && requirement.configuration !== null && typeof (requirement.configuration as { answerKey?: unknown }).answerKey === "string"
        ? { answerKey: (requirement.configuration as { answerKey: string }).answerKey }
        : {},
    }));
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    municipalityName: municipalityNameOf(row),
    fundingAmount: row.funding_amount,
    fundingCurrency: row.funding_currency,
    applicationDeadline: row.application_deadline,
    applicationAvailable: !row.application_deadline || new Date(row.application_deadline) > new Date(),
    requirements,
    documentRequirements: resolveGrantDocumentRequirements(requirements),
  };
}
