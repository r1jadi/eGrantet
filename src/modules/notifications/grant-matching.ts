/**
 * Deterministic grant-relevance matching.
 *
 * Computes an explainable 0–100 relevance score between an applicant profile
 * and a published grant from data both sides actually have. This is NOT
 * eligibility: a match only justifies "may be relevant to you" — deterministic
 * eligibility rules (eligibility module) remain the sole authority on whether
 * an applicant qualifies.
 *
 * Explanations are translation keys so the email/UI can render them in the
 * user's language.
 */

/** Minimum score for a personalized recommendation email (configurable via env). */
export const DEFAULT_MATCH_THRESHOLD = 60;

export function getMatchThreshold(): number {
  const raw = process.env.GRANT_MATCH_THRESHOLD?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : DEFAULT_MATCH_THRESHOLD;
}

/** Profile facts taken from the user's registration/application answers. */
export interface ApplicantProfile {
  /** Municipality the applicant is registered/active in (free text). */
  municipalityName?: string | null;
  /** Applicant type: individual, business, nonprofit, school, group… */
  applicantType?: string | null;
  /** Sector/activity keywords from the profile or past applications. */
  sectorKeywords?: string[];
  /** Typical requested funding range. */
  typicalFundingAmount?: number | null;
}

export interface GrantMatchInput {
  grantId: string;
  grantTitle: string;
  municipalityId: string;
  municipalityName: string;
  fundingAmount: number | null;
  /** Requirement keywords signal the grant's focus (names/descriptions). */
  requirementKeywords: string[];
}

export interface GrantMatchResult {
  grantId: string;
  score: number;
  /** Explanation keys from email.match* — empty when the score is 0. */
  reasons: string[];
}

const APPLICANT_TYPE_SYNONYMS: Record<string, string[]> = {
  business: ["business", "company", "preduzeće", "shoqëri", "firm"],
  nonprofit: ["nonprofit", "ngo", "association", "shoqata", "organizacija"],
  school: ["school", "shkollë", "škola"],
  group: ["group", "grupa", "grup"],
  individual: ["individual", "person", "fizicko", "fizike"],
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-zà-ž0-9 ]/gi, "").trim();
}

function overlaps(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Scores one grant against one applicant profile. Deterministic and
 * explainable; each matched dimension contributes a fixed share.
 */
export function scoreGrantForProfile(grant: GrantMatchInput, profile: ApplicantProfile): GrantMatchResult {
  const reasons: string[] = [];
  let score = 0;

  // Municipality alignment (40): the strongest local-relevance signal.
  if (profile.municipalityName && overlaps(profile.municipalityName, grant.municipalityName)) {
    score += 40;
    reasons.push("email.matchMunicipality");
  }

  // Applicant type vs grant focus keywords (30).
  if (profile.applicantType) {
    const synonyms = APPLICANT_TYPE_SYNONYMS[profile.applicantType.toLowerCase()] ?? [profile.applicantType];
    const focusText = normalize([grant.grantTitle, ...grant.requirementKeywords].join(" "));
    if (synonyms.some((synonym) => focusText.includes(normalize(synonym)))) {
      score += 30;
      reasons.push("email.matchApplicantType");
    }
  }

  // Sector keywords vs grant focus (20, proportional up to two hits).
  if (profile.sectorKeywords && profile.sectorKeywords.length > 0) {
    const focusText = normalize([grant.grantTitle, ...grant.requirementKeywords].join(" "));
    const hits = profile.sectorKeywords.filter((keyword) => keyword.trim() && focusText.includes(normalize(keyword))).length;
    if (hits > 0) {
      score += Math.min(20, hits * 10);
      reasons.push("email.matchSector");
    }
  }

  // Funding-range proximity (10): grant within ±50% of the typical ask.
  if (profile.typicalFundingAmount != null && grant.fundingAmount != null && profile.typicalFundingAmount > 0) {
    const ratio = grant.fundingAmount / profile.typicalFundingAmount;
    if (ratio >= 0.5 && ratio <= 2) {
      score += 10;
      reasons.push("email.matchFunding");
    }
  }

  return { grantId: grant.grantId, score: Math.min(100, score), reasons };
}

/** True when the match clears the configured threshold. */
export function isRelevantMatch(match: GrantMatchResult, threshold: number = getMatchThreshold()): boolean {
  return match.score >= threshold && match.reasons.length > 0;
}
