import { INTL_LOCALES, type Locale } from "./config";

/** Parses date-only (`YYYY-MM-DD`) or ISO timestamps safely. */
function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Some ICU builds (notably Chromium/Electron) ship the `sq` locale without
 * month names — `Intl.DateTimeFormat` degrades to placeholders like
 * "2026 M09 26", and even the element order differs from Node. When that is
 * detected we assemble the string ourselves with a fixed Albanian
 * day-month-year pattern so server and client render identically (no
 * hydration mismatches).
 */
const SQ_MONTHS_SHORT = [
  "jan", "shk", "mar", "pri", "maj", "qer",
  "kor", "gsh", "sht", "tet", "nën", "dhj",
] as const;

const SQ_MONTHS_LONG = [
  "janar", "shkurt", "mars", "prill", "maj", "qershor",
  "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor",
] as const;

let sqMonthDataUsable: boolean | null = null;

/** True when this ICU build can format Albanian months natively. */
function sqHasMonthData(): boolean {
  if (sqMonthDataUsable === null) {
    try {
      const probe = new Intl.DateTimeFormat(INTL_LOCALES.sq, { month: "short", timeZone: "UTC" });
      const sample = probe.format(new Date(Date.UTC(2026, 8, 15)));
      sqMonthDataUsable = !/^M\d\d$/.test(sample);
    } catch {
      sqMonthDataUsable = false;
    }
  }
  return sqMonthDataUsable;
}

/**
 * Builds "26 sht 2026" / "26 shtator 2026" from one formatToParts pass so
 * day/month/year all come from the same local-time interpretation. Numerals
 * still come from Intl, so digit shaping matches the surrounding UI.
 */
function sqAssembledDate(options: Intl.DateTimeFormatOptions, date: Date, months: readonly string[]): string {
  try {
    const parts = new Intl.DateTimeFormat(INTL_LOCALES.sq, options).formatToParts(date);
    const day = parts.find((part) => part.type === "day")?.value;
    const year = parts.find((part) => part.type === "year")?.value;
    const monthValue = parts.find((part) => part.type === "month")?.value ?? "";
    const monthIndex = /^M\d\d$/.test(monthValue) ? Number(monthValue.slice(1)) - 1 : -1;
    if (day && year && monthIndex >= 0 && monthIndex <= 11) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  } catch {
    /* fall through to the plain formatter below */
  }
  return new Intl.DateTimeFormat(INTL_LOCALES.sq, options).format(date);
}

/** Short date, e.g. "12 sht 2026" / "26 Sept 2026". */
export function formatDate(locale: Locale, value: string | Date | null | undefined): string {
  if (!value) return "—";
  const parsed = parseDate(value);
  if (!parsed) return "—";
  const intlLocale = INTL_LOCALES[locale];
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (locale === "sq" && !sqHasMonthData()) return sqAssembledDate(options, parsed, SQ_MONTHS_SHORT);
  return new Intl.DateTimeFormat(intlLocale, options).format(parsed);
}

/** Long date for letters/documents, e.g. "12 shtator 2026". */
export function formatDateLong(locale: Locale, value: string | Date | null | undefined): string {
  if (!value) return "—";
  const parsed = parseDate(value);
  if (!parsed) return "—";
  const intlLocale = INTL_LOCALES[locale];
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  if (locale === "sq" && !sqHasMonthData()) return sqAssembledDate(options, parsed, SQ_MONTHS_LONG);
  return new Intl.DateTimeFormat(intlLocale, options).format(parsed);
}

/**
 * Date + 24h time, e.g. "26 sht 2026, 14:30". Assembled from one
 * formatToParts pass for every locale so day/month ordering, hour cycle, and
 * separators are identical between server (Node ICU) and client (Chromium
 * ICU) — the two engines disagree on native date-time patterns.
 */
export function formatDateTime(locale: Locale, value: string | Date | null | undefined): string {
  if (!value) return "—";
  const parsed = parseDate(value);
  if (!parsed) return "—";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  };
  try {
    const parts = new Intl.DateTimeFormat(INTL_LOCALES[locale], options).formatToParts(parsed);
    const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    const day = pick("day");
    const year = pick("year");
    const hour = pick("hour");
    const minute = pick("minute");
    const monthValue = pick("month") ?? "";
    let month = monthValue;
    if (locale === "sq" && /^M\d\d$/.test(monthValue)) {
      month = SQ_MONTHS_SHORT[Math.max(0, Math.min(11, Number(monthValue.slice(1)) - 1))];
    }
    if (day && year && month && hour && minute) return `${day} ${month} ${year}, ${hour}:${minute}`;
  } catch {
    /* fall through to the plain formatter below */
  }
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], options).format(parsed);
}

/** Zero-decimal currency for award/funding amounts. */
export function formatCurrency(locale: Locale, amount: number | null, currency: string | null): string {
  if (amount === null || currency === null) return "—";
  return new Intl.NumberFormat(INTL_LOCALES[locale], { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

/** Grouped integer formatting for counts. */
export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale]).format(value);
}
