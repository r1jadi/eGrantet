import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { applicationSummaryService, type ApplicationSummaryFacts } from "@/modules/ai";
import { requireProfile } from "@/lib/auth/server";
import { buildApplicationSummaryFacts, hasUsableProjectData } from "../summary-facts";
import { getMunicipalApplicationDetail } from "./municipal-application-service";

export const generateSummaryInputSchema = z.object({ applicationId: z.uuid() });

export interface StoredApplicationSummary {
  summary: string;
  generatedAt: string;
}

/**
 * True when the ai_summary columns are missing (migration 20260926000000 not
 * applied yet). PostgREST reports this as 42703 on select and PGRST204 on
 * update; both mean persistence is unavailable, not that something failed.
 */
function isSummaryColumnsMissing(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  return code === "42703" || code === "PGRST204" || message.includes("ai_summary");
}

/**
 * Generates a 3–4 sentence AI summary of the application and persists it on
 * the application record. The AI input is built exclusively from the
 * application's own submitted data; the decision letter flow's authorization
 * boundary (getMunicipalApplicationDetail → requireMunicipalityAccess) gates
 * everything.
 */
export async function generateApplicationSummary(applicationId: string): Promise<StoredApplicationSummary> {
  const parsed = generateSummaryInputSchema.safeParse({ applicationId });
  if (!parsed.success) throw new AppError("VALIDATION", "Invalid application reference.");

  // Authorization boundary: also supplies the audit actor.
  const profile = await requireProfile();
  const detail = await getMunicipalApplicationDetail(parsed.data.applicationId);

  if (!hasUsableProjectData(detail.answers ?? {})) {
    throw new AppError("VALIDATION", "This application does not contain enough project information to summarize yet.");
  }

  const facts: ApplicationSummaryFacts = buildApplicationSummaryFacts(detail);

  let summary: string;
  try {
    ({ summary } = await applicationSummaryService.generateApplicationSummary(facts));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AI", "The AI service is unavailable. Please try again.", error);
  }

  const generatedAt = new Date().toISOString();
  const { error } = await createSupabaseAdminClient()
    .from("applications")
    .update({ ai_summary: summary, ai_summary_generated_at: generatedAt })
    .eq("id", parsed.data.applicationId);
  if (error && !isSummaryColumnsMissing(error)) {
    throw new AppError("DATABASE", "Unable to save the summary.", error);
  }
  const persisted = !error;

  await recordAuditEvent({
    actorId: profile.id,
    action: "APPLICATION_SUMMARY_GENERATED",
    entityType: "application",
    entityId: parsed.data.applicationId,
    metadata: { aiAssisted: true, characters: summary.length, persisted },
  });

  return { summary, generatedAt };
}

/** Returns the persisted summary, if any (no AI call). */
export async function getStoredApplicationSummary(applicationId: string): Promise<StoredApplicationSummary | null> {
  const detail = await getMunicipalApplicationDetail(applicationId); // authorization boundary
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("applications")
    .select("ai_summary, ai_summary_generated_at")
    .eq("id", detail.id)
    .maybeSingle();
  // 42703/PGRST204 = migration not applied yet; the summary feature is simply absent.
  if (error && !isSummaryColumnsMissing(error)) {
    throw new AppError("DATABASE", "Unable to load the summary.", error);
  }
  if (!data?.ai_summary) return null;
  return { summary: String(data.ai_summary), generatedAt: String(data.ai_summary_generated_at ?? new Date(0).toISOString()) };
}
