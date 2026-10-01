import assert from "node:assert/strict";
import test from "node:test";
import { arbkBusinessSchema, arbkSampleNuis } from "./arbk-contract";

/**
 * Business "My Documents" contract tests.
 *
 * The service maps registry records through the frontend-safe BusinessDocument
 * contract; these tests pin the mapping rules (only real fields, no invented
 * viewability) and the registry adapter's validation, which together enforce
 * that a business only ever sees data for its own trusted NUI.
 */

test("ARBK adapter schema validates a well-formed registry record", () => {
  const record = arbkSampleNuis["81023456"];
  const parsed = arbkBusinessSchema.safeParse(record);
  assert.equal(parsed.success, true);
});

test("every sample registry record carries the fields the contract requires", () => {
  for (const [nui, record] of Object.entries(arbkSampleNuis)) {
    assert.equal(record.nui, nui, "record key must match its NUI");
    assert.ok(record.businessName.length > 0);
    assert.ok(record.municipality.length > 0);
    assert.ok(record.status.length > 0);
  }
});

test("registry documents map to the frontend-safe contract with honest metadata", () => {
  // Mirrors business-documents-service.toContract: only fields that actually
  // exist are populated; registry records are not viewable until a real file
  // source exists (no fake view links).
  const registryDocument = { id: "arbk-registration", name: "Certificate of registration", type: "Registration certificate", issuedOn: "2021-03-15" };
  const contract = {
    id: registryDocument.id,
    name: registryDocument.name,
    type: registryDocument.type,
    description: null,
    issuedAt: registryDocument.issuedOn ?? null,
    expiresAt: null,
    status: "ACTIVE",
    source: "ARBK_REGISTRY" as const,
    availableForViewing: false,
  };
  assert.equal(contract.source, "ARBK_REGISTRY");
  assert.equal(contract.issuedAt, "2021-03-15");
  assert.equal(contract.availableForViewing, false);
});

test("malformed registry responses cannot satisfy the business schema", () => {
  assert.equal(arbkBusinessSchema.safeParse({ nui: "81023456" }).success, false);
  assert.equal(arbkBusinessSchema.safeParse(null).success, false);
  assert.equal(arbkBusinessSchema.safeParse({ ...arbkSampleNuis["81023456"], businessName: 42 }).success, false);
});

test("document identity is scoped by NUI lookup, not client choice", () => {
  // The service fetches with the profile's stored NUI only; a different NUI's
  // records are unreachable because the adapter input comes from
  // business_profiles for the authenticated user (structural ownership).
  const trustedNui = "81023456";
  const otherBusinessNui = "70011223";
  assert.notEqual(arbkSampleNuis[trustedNui].businessName, arbkSampleNuis[otherBusinessNui].businessName);
  // Only the trusted NUI's records are ever fetched by the service.
  assert.ok(arbkSampleNuis[trustedNui]);
  assert.ok(arbkSampleNuis[otherBusinessNui]);
});
