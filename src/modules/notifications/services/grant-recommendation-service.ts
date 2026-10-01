import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
import { translate, type Locale } from "@/lib/i18n";
import { parseLocale } from "@/lib/i18n/config";
import { isRelevantMatch, scoreGrantForProfile, type ApplicantProfile, type GrantMatchInput } from "../grant-matching";
import { grantUrl, notifyUser } from "./email-notification-service";

/**
 * Grant publication → personalized recommendation notifications.
 *
 * Flow: published grant → applicant profiles → deterministic relevance score
 * → threshold gate → preference gate (inside notifyUser) → in-app + email at
 * the account email. Irrelevant users and users with insufficient profile
 * information receive nothing.
 */

/** Extracts applicant profile facts from the user's past application answers. */
function profileFromAnswers(answers: Record<string, unknown>): ApplicantProfile {
  const stringAnswer = (key: string) => (typeof answers[key] === "string" ? (answers[key] as string).trim() : null);
  const organisationName = stringAnswer("organisationName");
  const sectorKeywords = [organisationName].filter((value): value is string => Boolean(value));
  const budget = stringAnswer("budgetAmount");
  const typical = budget ? Number(budget.replace(/[^\d.-]/g, "")) : null;
  return {
    municipalityName: stringAnswer("municipality") ?? stringAnswer("registeredMunicipality"),
    applicantType: stringAnswer("organisationType") ?? stringAnswer("accountType"),
    sectorKeywords,
    typicalFundingAmount: Number.isFinite(typical) ? typical : null,
  };
}

export interface RecommendationOutcome {
  matched: number;
  notified: number;
  skippedIrrelevant: number;
}

/**
 * Notifies potentially-relevant applicants about a newly published grant.
 * Called from the grant publish transition; failures are logged and swallowed
 * so publication always succeeds.
 */
export async function notifyRelevantUsersOfPublishedGrant(grantId: string): Promise<RecommendationOutcome> {
  const outcome: RecommendationOutcome = { matched: 0, notified: 0, skippedIrrelevant: 0 };
  try {
    const admin = createSupabaseAdminClient();
    const { data: grant, error: grantError } = await admin
      .from("grants")
      .select("id, title, municipality_id, funding_amount, funding_currency, application_deadline, municipalities(name), grant_requirements(name, description)")
      .eq("id", grantId)
      .maybeSingle();
    if (grantError) throw grantError;
    if (!grant) return outcome;

    const municipalityName = ((grant.municipalities as unknown as Array<{ name: string }> | { name: string } | null));
    const municipalityLabel = Array.isArray(municipalityName) ? (municipalityName[0]?.name ?? "") : (municipalityName?.name ?? "");
    const requirements = (grant.grant_requirements ?? []) as Array<{ name: string; description: string }>;

    const matchInput: GrantMatchInput = {
      grantId: grant.id,
      grantTitle: grant.title,
      municipalityId: grant.municipality_id,
      municipalityName: municipalityLabel,
      fundingAmount: grant.funding_amount === null ? null : Number(grant.funding_amount),
      requirementKeywords: requirements.flatMap((requirement) => [requirement.name, requirement.description].filter((value): value is string => Boolean(value))),
    };

    // Applicant pool: users with at least one application (real profile data).
    const { data: applicationRows, error: applicationsError } = await admin
      .from("applications")
      .select("applicant_id, answers, users!applications_applicant_id_fkey(id, language)")
      .not("applicant_id", "is", null)
      .limit(500);
    if (applicationsError) throw applicationsError;

    const seenUsers = new Set<string>();
    for (const row of applicationRows ?? []) {
      const userId = row.applicant_id as string;
      if (seenUsers.has(userId)) continue;
      seenUsers.add(userId);

      const profile = profileFromAnswers((row.answers ?? {}) as Record<string, unknown>);
      const match = scoreGrantForProfile(matchInput, profile);
      if (!isRelevantMatch(match)) {
        outcome.skippedIrrelevant += 1;
        continue;
      }
      outcome.matched += 1;

      const language = (row.users as unknown as { language?: string } | null)?.language;
      const locale = parseLocale(language);
      const result = await notifyUser({
        userId,
        category: "recommended_grants",
        inApp: {
          type: "GRANT_RECOMMENDATION",
          title: translate(locale, "email.grantHeading"),
          message: translate(locale, "email.grantSubject", { grantName: grant.title }),
        },
        email: {
          templateKind: "grant_recommendation",
          eventKey: `grant:${grant.id}:published:v1`,
          variables: {
            grantName: grant.title,
            municipality: municipalityLabel,
            deadline: (grant as unknown as { application_deadline: string | null }).application_deadline,
            fundingAmount: grant.funding_amount === null ? null : formatFunding(locale, Number(grant.funding_amount)),
            fundingCurrency: (grant as unknown as { funding_currency: string | null }).funding_currency,
            matchReasons: match.reasons,
            grantUrl: grantUrl(grant.id),
          },
        },
      });
      if (result.emailStatus === "SENT") outcome.notified += 1;
    }
    return outcome;
  } catch (error) {
    // Publication must never fail because recommendations failed.
    logger.warn("grant_recommendation_batch_failed", { grantId, message: error instanceof Error ? error.message.slice(0, 200) : "unknown" });
    return outcome;
  }
}

function formatFunding(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(locale === "sq" ? "sq-XK" : locale === "sr" ? "sr-Latn-RS" : "en-IE", { maximumFractionDigits: 0 }).format(amount);
}
