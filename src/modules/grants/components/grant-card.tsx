import { ArrowUpRight, CalendarDays, Landmark } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentLocale } from "@/lib/i18n/current-locale";
import { translate, formatDate, type Locale } from "@/lib/i18n";
import { formatCurrency as formatCurrencyFor } from "@/lib/i18n/format";

type GrantCardLocale = Locale | undefined;

/** A published grant row shaped for applicant-facing cards (server-loaded). */
export interface DirectoryGrant {
  id: string;
  title: string;
  shortDescription: string;
  municipalityName: string;
  fundingAmount: number | null;
  fundingCurrency: string | null;
  applicationDeadline: string | null;
  /** Truncated description for cards without a dedicated summary column. */
  coverClassName?: string;
}

/**
 * Legacy-compatible formatters for existing callers: they follow the active
 * locale via the shared current-locale reader. Server pages that need a
 * specific locale pass one to `GrantCard` directly.
 */
export function formatCurrency(amount: number | null, currency: string | null): string {
  return formatCurrencyFor(getCurrentLocale(), amount, currency);
}

export function formatDeadline(date: string | null, locale = getCurrentLocale()): string {
  const parsed = formatDate(locale, date);
  if (parsed === "—") return translate(locale, "grants.deadlineTba");
  return translate(locale, "grants.deadline").replace("{date}", parsed);
}

const coverClasses = [
  "from-emerald-700 to-teal-600",
  "from-indigo-700 to-sky-600",
  "from-rose-700 to-orange-600",
  "from-violet-700 to-fuchsia-600",
  "from-cyan-700 to-blue-600",
];

function coverFor(grantId: string): string {
  let hash = 0;
  for (const character of grantId) hash = (hash * 31 + character.charCodeAt(0)) % 997;
  return coverClasses[hash % coverClasses.length] as string;
}

export function GrantCard({ grant, featured = false, locale }: { grant: DirectoryGrant; featured?: boolean; locale?: GrantCardLocale }) {
  const activeLocale = locale ?? getCurrentLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(activeLocale, key);
  const money = formatCurrencyFor(activeLocale, grant.fundingAmount, grant.fundingCurrency);
  return <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
    <div className={`h-2 bg-gradient-to-r ${grant.coverClassName ?? coverFor(grant.id)}`} />
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-3"><Badge variant="outline">{grant.municipalityName}</Badge><span className="text-sm font-semibold text-primary">{t("grants.upTo").replace("{amount}", money)}</span></div>
      <h2 className={featured ? "mt-5 text-xl font-bold tracking-tight" : "mt-4 text-lg font-bold tracking-tight"}><Link className="after:absolute after:inset-0 focus:outline-none" href={`/grants/${grant.id}`}>{grant.title}</Link></h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{grant.shortDescription}</p>
      <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground"><p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" /><span>{t("grants.deadline").replace("{date}", formatDate(activeLocale, grant.applicationDeadline))}</span></p><p className="flex items-center gap-2"><Landmark className="size-4 shrink-0 text-primary" aria-hidden="true" />{grant.municipalityName}</p></div>
      <div className="relative mt-5 flex items-center gap-1 text-sm font-semibold text-primary">{t("grants.viewGrant")} <ArrowUpRight className="size-4" aria-hidden="true" /></div>
    </div>
  </Card>;
}
