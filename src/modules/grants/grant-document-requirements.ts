import type { RequirementType } from "./types";

/**
 * Grant-specific required-documents resolver.
 *
 * A grant's requirements define which documents an applicant must submit:
 * every requirement with `type = "DOCUMENT"` maps to one document slot, whose
 * required/optional status comes from the requirement's `is_required` flag.
 * Nothing is hardcoded: the list is derived from whatever the municipality
 * configured for that grant.
 *
 * This is a pure mapping module so the exact rules (which requirements become
 * document slots, how required/optional is decided, what the applicant sees)
 * can be pinned by unit tests. The service layer applies it to real rows.
 */

export interface RequirementLike {
  id: string;
  name: string;
  description: string;
  type: RequirementType | string;
  isRequired: boolean;
}

/** Frontend-safe contract for one required/optional grant document. */
export interface GrantDocumentRequirement {
  /** The requirement id: the upload slot an application document attaches to. */
  id: string;
  name: string;
  type: string;
  description: string;
  isRequired: boolean;
}

/**
 * Derives the exact document list for one grant from its configured
 * requirements, in display order. Non-document requirements are ignored;
 * document requirements map 1:1 to document slots.
 */
export function resolveGrantDocumentRequirements(
  requirements: ReadonlyArray<RequirementLike>,
): GrantDocumentRequirement[] {
  return requirements
    .filter((requirement) => requirement.type === "DOCUMENT")
    .map((requirement) => ({
      id: requirement.id,
      name: requirement.name,
      type: "DOCUMENT",
      description: requirement.description,
      isRequired: requirement.isRequired,
    }));
}

/**
 * Server-side submission gate: returns the requirement ids whose document is
 * required but not uploaded (status UPLOADED). An empty result means the
 * application may proceed. Optional documents never block submission, and a
 * document attached to the wrong requirement does not satisfy another.
 */
export function missingRequiredDocumentIds(
  requirements: ReadonlyArray<RequirementLike>,
  uploadedRequirementIds: ReadonlySet<string>,
): string[] {
  return resolveGrantDocumentRequirements(requirements)
    .filter((document) => document.isRequired && !uploadedRequirementIds.has(document.id))
    .map((document) => document.id);
}
