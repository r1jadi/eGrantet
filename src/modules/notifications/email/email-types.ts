/**
 * Localized email templates for the notification layer.
 *
 * Templates are data + pure functions: every string lives in the i18n
 * dictionaries (sq/en/sr) so the web app and the emails always agree, and a
 * template is selected once per send by the user's stored language.
 */

import { translate, type Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n/format";

export interface GrantEmailVariables {
  grantName: string;
  municipality: string;
  deadline: string | null;
  fundingAmount: string | null;
  fundingCurrency: string | null;
  matchReasons: string[];
  grantUrl: string;
}

export interface ApplicationEmailVariables {
  status: string;
  applicationUrl: string;
  applicationReference: string;
}

export interface MilestoneEmailVariables {
  milestone: string;
  status: string;
  applicationUrl: string;
}

export interface EvaluationEmailVariables {
  applicationReference: string;
  evaluationUrl: string;
}

export interface VerificationEmailVariables {
  applicationReference: string;
  applicationUrl: string;
}

export interface RenderedEmail {
  subject: string;
  heading: string;
  bodyLines: string[];
  /** Bullet list rendered under the heading, when applicable. */
  bullets: string[];
  ctaLabel: string;
  ctaUrl: string;
  footerLines: string[];
}

type TemplateKind = "grant_recommendation" | "application_status" | "decision" | "milestone" | "evaluation" | "verification";

interface TemplateContext {
  locale: Locale;
  grant?: GrantEmailVariables;
  application?: ApplicationEmailVariables;
  milestone?: MilestoneEmailVariables;
  evaluation?: EvaluationEmailVariables;
  verification?: VerificationEmailVariables;
}

/** Match-reason translation keys used by the grant recommendation template. */
const MATCH_REASON_KEYS = ["email.matchApplicantType", "email.matchMunicipality", "email.matchSector", "email.matchFunding"] as const;

export function matchReasonLabel(locale: Locale, reason: string): string {
  const keyIndex = MATCH_REASON_KEYS.indexOf(reason as (typeof MATCH_REASON_KEYS)[number]);
  return translate(locale, keyIndex >= 0 ? (MATCH_REASON_KEYS[keyIndex] as string) : reason);
}

/** Localizes an application/milestone status enum for email text; unknown values pass through safely. */
export function statusLabel(locale: Locale, status: string): string {
  const key = `statusLabels.application.${status}`;
  return resolveKey(locale, key) ?? status;
}

function resolveKey(locale: Locale, key: string): string | undefined {
  const resolved = translate(locale, key);
  // `translate` falls back to the key itself when a key is missing everywhere.
  return resolved === key ? undefined : resolved;
}

function render(locale: Locale, kind: TemplateKind, context: TemplateContext): RenderedEmail {
  const t = (key: string, values?: Record<string, unknown>) => translate(locale, key, values);
  const footer = [t("email.footerAutomated"), t("email.footerPreferences")];

  if (kind === "grant_recommendation" && context.grant) {
    const { grantName, municipality, deadline, fundingAmount, fundingCurrency, matchReasons, grantUrl } = context.grant;
    const deadlineLine = deadline ? `${t("grants.applicationDeadline")}: ${formatDate(locale, deadline)}` : null;
    return {
      subject: t("email.grantSubject", { grantName }),
      heading: t("email.grantHeading"),
      bodyLines: [
        t("email.grantIntro"),
        `${t("grants.aboutGrantLong")}: ${grantName}`,
        `${t("grants.deliveredBy")}: ${municipality}`,
        ...(deadlineLine ? [deadlineLine] : []),
        ...(fundingAmount && fundingCurrency ? [`${t("grants.funding")}: ${t("grants.upTo", { amount: fundingAmount })} ${fundingCurrency}`] : []),
      ],
      bullets: matchReasons.map((reason) => matchReasonLabel(locale, reason)),
      ctaLabel: t("email.grantCta"),
      ctaUrl: grantUrl,
      footerLines: footer,
    };
  }

  if (kind === "application_status" && context.application) {
    const { status, applicationUrl } = context.application;
    const label = statusLabel(locale, status);
    return {
      subject: t("email.statusSubject", { status: label }),
      heading: t("email.statusHeading"),
      bodyLines: [t("email.statusBody", { status: label })],
      bullets: [],
      ctaLabel: t("email.statusCta"),
      ctaUrl: applicationUrl,
      footerLines: footer,
    };
  }

  if (kind === "decision" && context.application) {
    const label = statusLabel(locale, context.application.status);
    return {
      subject: t("email.decisionSubject"),
      heading: t("email.decisionHeading"),
      bodyLines: [t("email.statusBody", { status: label })],
      bullets: [],
      ctaLabel: t("email.decisionCta"),
      ctaUrl: context.application.applicationUrl,
      footerLines: footer,
    };
  }

  if (kind === "milestone" && context.milestone) {
    const { milestone, status, applicationUrl } = context.milestone;
    return {
      subject: t("email.milestoneSubject"),
      heading: t("email.milestoneHeading"),
      bodyLines: [t("email.milestoneBody", { milestone, status: statusLabel(locale, status) })],
      bullets: [],
      ctaLabel: t("email.milestoneCta"),
      ctaUrl: applicationUrl,
      footerLines: footer,
    };
  }

  if (kind === "evaluation" && context.evaluation) {
    return {
      subject: t("email.evaluationSubject"),
      heading: t("email.evaluationHeading"),
      bodyLines: [t("email.evaluationBody")],
      bullets: [],
      ctaLabel: t("email.evaluationCta"),
      ctaUrl: context.evaluation.evaluationUrl,
      footerLines: footer,
    };
  }

  if (kind === "verification" && context.verification) {
    return {
      subject: t("email.verificationSubject"),
      heading: t("email.verificationHeading"),
      bodyLines: [t("email.verificationBody")],
      bullets: [],
      ctaLabel: t("email.verificationCta"),
      ctaUrl: context.verification.applicationUrl,
      footerLines: footer,
    };
  }

  throw new Error(`Email template ${kind} is missing its variables.`);
}

export { render as renderEmailTemplate };
export type { TemplateKind as EmailTemplateKind };
