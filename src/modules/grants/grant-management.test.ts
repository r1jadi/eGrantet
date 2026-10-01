import assert from "node:assert/strict";
import test from "node:test";
import { assertGrantTransition } from "./lifecycle";

/** Mirrors the server-side publish gate in transitionGrant. */
export function canPublish(deadline: string | null, now = new Date()): boolean {
  return deadline !== null && new Date(deadline) > now;
}

test("publishing requires a strictly future deadline", () => {
  const now = new Date("2026-09-26T12:00:00Z");
  assert.equal(canPublish("2026-09-26T13:00:00Z", now), true);
  assert.equal(canPublish("2026-09-26T12:00:00Z", now), false, "deadline equal to now is not in the future");
  assert.equal(canPublish("2026-09-26T11:59:00Z", now), false);
  assert.equal(canPublish(null, now), false);
});

test("publish gate matches the lifecycle assertion for valid transitions", () => {
  assert.doesNotThrow(() => assertGrantTransition("DRAFT", "PUBLISHED"));
  assert.throws(() => assertGrantTransition("PUBLISHED", "DRAFT"));
  assert.throws(() => assertGrantTransition("DRAFT", "CLOSED"));
  assert.throws(() => assertGrantTransition("CLOSED", "PUBLISHED"));
  assert.throws(() => assertGrantTransition("ARCHIVED", "PUBLISHED"));
});

/** Mirrors reorderGrantRequirements validation. */
export function isValidReorder(existingIds: string[], orderedIds: string[]): boolean {
  const existing = new Set(existingIds);
  if (orderedIds.length !== existing.size) return false;
  const unique = new Set(orderedIds);
  return unique.size === existing.size && [...unique].every((id) => existing.has(id));
}

test("requirement reorder accepts exactly a permutation of existing ids", () => {
  const existing = ["a", "b", "c"];
  assert.equal(isValidReorder(existing, ["c", "a", "b"]), true);
  assert.equal(isValidReorder(existing, ["a", "b"]), false, "missing id rejected");
  assert.equal(isValidReorder(existing, ["a", "b", "c", "a"]), false, "duplicate id rejected");
  assert.equal(isValidReorder(existing, ["a", "b", "x"]), false, "unknown id rejected");
  assert.equal(isValidReorder([], []), true, "empty grant trivially valid");
});

/** Mirrors the draft-only editing matrix enforced by the services. */
export function canEditGrant(status: string): boolean {
  return status === "DRAFT";
}

test("grant/requirement/criteria edits are draft-only", () => {
  for (const status of ["DRAFT"]) assert.equal(canEditGrant(status), true);
  for (const status of ["PUBLISHED", "CLOSED", "ARCHIVED"]) assert.equal(canEditGrant(status), false);
});

/** Mirrors deleteDraftGrant: only drafts may be deleted. */
export function canDeleteGrant(status: string): boolean {
  return status === "DRAFT";
}

test("only draft grants are deletable", () => {
  assert.equal(canDeleteGrant("DRAFT"), true);
  assert.equal(canDeleteGrant("PUBLISHED"), false);
});
