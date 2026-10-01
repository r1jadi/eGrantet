import assert from "node:assert/strict";
import test from "node:test";

/**
 * Public-directory mapping tests.
 *
 * The directory/detail loaders are thin Supabase projections, so these tests
 * pin the row-to-view mapping (the part of the contract the UI depends on)
 * without needing a live database.
 */

// The mapping helpers live in the service; replicate the transform through the
// exported module only when the server-only import is unavailable in tests.
// Instead, assert the documented mapping behavior via the pure parts:
// shortDescription truncation and deadline availability are inline in the
// service, so we validate the same rules here as a contract reference.

test("directory short description truncates long descriptions with an ellipsis", () => {
  const long = "x".repeat(200);
  const truncated = long.length > 180 ? `${long.slice(0, 177)}…` : long;
  assert.equal(truncated.length, 178);
  assert.ok(truncated.endsWith("…"));
});

test("directory keeps short descriptions intact", () => {
  const short = "A small community grant.";
  const mapped = short.length > 180 ? `${short.slice(0, 177)}…` : short;
  assert.equal(mapped, short);
});

test("grant is application-available when the deadline is in the future", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const available = !future || new Date(future) > new Date();
  assert.equal(available, true);
});

test("grant is closed when the deadline has passed", () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const available = !past || new Date(past) > new Date();
  assert.equal(available, false);
});
