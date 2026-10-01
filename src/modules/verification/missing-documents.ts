/**
 * Missing-document detection.
 *
 * Pure logic over the grant's configured requirements and the application's
 * submitted documents. The submission workflow already blocks missing
 * required documents; this layer re-checks independently so verification can
 * report exactly what is absent (e.g. after corrections or replacements).
 */

export interface MissingDocumentReport {
  missingRequirementIds: string[];
  missingRequirementNames: string[];
}

export function detectMissingDocuments(
  requirements: Array<{ id: string; name: string; type: string; isRequired: boolean }>,
  documents: Array<{ requirementId: string | null; status: string }>,
): MissingDocumentReport {
  const activeDocumentRequirementIds = new Set(
    documents.filter((document) => document.status === "UPLOADED" && document.requirementId).map((document) => document.requirementId as string),
  );
  const missing = requirements.filter(
    (requirement) => requirement.type === "DOCUMENT" && requirement.isRequired && !activeDocumentRequirementIds.has(requirement.id),
  );
  return {
    missingRequirementIds: missing.map((requirement) => requirement.id),
    missingRequirementNames: missing.map((requirement) => requirement.name),
  };
}
