/**
 * Cross-document consistency checks.
 *
 * Pure comparison logic: given normalized field values from the application
 * and from AI-extracted document fields, classify each comparable field as
 * CONSISTENT, CONFLICTING, or MISSING on one side. Only fields that genuinely
 * exist in both sources are compared.
 */

export type ConsistencyOutcome = "CONSISTENT" | "CONFLICTING" | "MISSING_APPLICATION" | "MISSING_DOCUMENT";

export interface ConsistencyCheck {
  /** Logical field name compared (e.g. "organisationName"). */
  field: string;
  outcome: ConsistencyOutcome;
  applicationValue: string | null;
  documentValue: string | null;
  /** Free-text note for reviewer-facing explanation. */
  note: string;
}

/** Application answer keys worth comparing with document-extracted fields. */
export const COMPARABLE_FIELDS = [
  { applicationKey: "organisationName", documentField: "businessName|organisation|company name|applicant name", label: "Organisation name" },
  { applicationKey: "registrationNumber", documentField: "registrationNumber|registration number|tax number|nui", label: "Registration number" },
  { applicationKey: "projectTitle", documentField: "projectTitle|project title|project name", label: "Project title" },
  { applicationKey: "budgetAmount", documentField: "totalAmount|total requested|requested amount|total amount", label: "Requested amount" },
  { applicationKey: "contactName", documentField: "contactPerson|representative|contact person|director", label: "Contact person" },
] as const;

/** Normalizes a value for tolerant comparison (case, spacing, currency, separators). */
export function normalizeComparableValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[€$]/g, "")
    .replace(/[.,\s]/g, "")
    .replace(/sh\.?p\.?k\.?/g, "shpk")
    .trim();
}

function matchesFieldPattern(documentFieldName: string, patterns: string): boolean {
  const normalized = documentFieldName.toLowerCase().replace(/[^a-z]/g, "");
  return patterns.split("|").some((pattern) => {
    const normalizedPattern = pattern.toLowerCase().replace(/[^a-z]/g, "");
    return normalizedPattern.length > 0 && (normalized === normalizedPattern || normalized.includes(normalizedPattern));
  });
}

/** Amounts match when numerically equal after normalization. */
function valuesMatch(applicationValue: string, documentValue: string): boolean {
  const left = normalizeComparableValue(applicationValue);
  const right = normalizeComparableValue(documentValue);
  if (left === right) return true;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber === rightNumber;
  // Substring tolerance for names ("ABC" vs "ABC SH.P.K." stays consistent only if equal).
  return false;
}

/**
 * Compares application answers against the extracted fields of one document
 * analysis. Returns only checks where both sides have a comparable field, or
 * where one side is missing while the other exists (missing classification).
 */
export function compareApplicationWithDocument(
  answers: Record<string, unknown>,
  documentFields: Array<{ name: string; value: string }>,
  documentFileName: string,
): ConsistencyCheck[] {
  const checks: ConsistencyCheck[] = [];
  for (const { applicationKey, documentField, label } of COMPARABLE_FIELDS) {
    const applicationRaw = answers[applicationKey];
    const applicationValue = typeof applicationRaw === "string" && applicationRaw.trim() ? applicationRaw.trim() : null;
    const documentMatch = documentFields.find((field) => matchesFieldPattern(field.name, documentField));
    const documentValue = documentMatch && documentMatch.value.trim() ? documentMatch.value.trim() : null;

    if (applicationValue && documentValue) {
      const consistent = valuesMatch(applicationValue, documentValue);
      checks.push({
        field: applicationKey,
        outcome: consistent ? "CONSISTENT" : "CONFLICTING",
        applicationValue,
        documentValue,
        note: consistent
          ? `${label} matches the value in ${documentFileName}.`
          : `${label} differs: application says "${applicationValue}", ${documentFileName} shows "${documentValue}".`,
      });
    } else if (applicationValue && !documentValue) {
      checks.push({
        field: applicationKey,
        outcome: "MISSING_DOCUMENT",
        applicationValue,
        documentValue: null,
        note: `${label} is present in the application but was not found in ${documentFileName}.`,
      });
    } else if (!applicationValue && documentValue) {
      checks.push({
        field: applicationKey,
        outcome: "MISSING_APPLICATION",
        applicationValue: null,
        documentValue,
        note: `${label} is present in ${documentFileName} but missing from the application answers.`,
      });
    }
    // Neither side has the field: nothing comparable, no check emitted.
  }
  return checks;
}

/** Aggregates checks across documents into the inconsistency list persisted on the verification. */
export function collectInconsistencies(allChecks: ConsistencyCheck[]): Array<{ field: string; documentFileName?: string; applicationValue: string | null; documentValue: string | null; note: string }> {
  return allChecks
    .filter((check) => check.outcome === "CONFLICTING")
    .map((check) => ({ field: check.field, applicationValue: check.applicationValue, documentValue: check.documentValue, note: check.note }));
}
