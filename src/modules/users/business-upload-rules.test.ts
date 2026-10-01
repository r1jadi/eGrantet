import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Business upload rule tests.
 *
 * These pin the security-relevant behavior of the replaced UI-only stub:
 * uploads persist to a private bucket keyed by the authenticated user's id,
 * file type/size are validated server-side, failed metadata writes clean up
 * storage, and view URLs are short-lived signed URLs after an ownership check.
 */

const serviceSource = readFileSync("src/modules/users/services/business-upload-service.ts", "utf8");
const componentSource = readFileSync("src/modules/users/components/my-business-documents.tsx", "utf8");
const migrationSource = readFileSync("supabase/migrations/20260927000000_appeals_and_business_documents.sql", "utf8");

test("no fake persistence remains in the business documents UI", () => {
  assert.ok(!componentSource.includes("setTimeout"), "upload must call the real server action");
  assert.ok(componentSource.includes("uploadBusinessDocumentAction"));
  assert.ok(componentSource.includes("deleteBusinessDocumentAction"));
  assert.ok(componentSource.includes("viewBusinessDocumentAction"));
});

test("storage ownership is derived from the authenticated profile, never client input", () => {
  assert.ok(serviceSource.includes("getCurrentBusinessProfile()"));
  assert.ok(serviceSource.includes("${profile.userId}/${documentId}/${safeName}"));
});

test("file type and size are validated server-side", () => {
  assert.ok(serviceSource.includes('allowedContentTypes.has(file.type)'));
  assert.ok(serviceSource.includes("10 * 1024 * 1024"));
});

test("failed metadata insert removes the orphaned storage file", () => {
  assert.ok(serviceSource.includes('remove([storagePath])'));
});

test("document viewing is a short-lived signed URL after ownership verification", () => {
  assert.ok(serviceSource.includes("createSignedUrl"));
  assert.ok(serviceSource.includes("createSignedUrl(String(document.storage_path), 300)"));
  assert.ok(serviceSource.includes("You cannot view this document."));
});

test("uploads and deletions are audited", () => {
  assert.ok(serviceSource.includes("BUSINESS_DOCUMENT_UPLOADED"));
  assert.ok(serviceSource.includes("BUSINESS_DOCUMENT_DELETED"));
  assert.ok(serviceSource.includes("BUSINESS_DOCUMENT_VIEWED"));
});

test("the migration creates the private bucket with per-user folder policies", () => {
  assert.ok(migrationSource.includes("'business-documents', 'business-documents', false"));
  assert.ok(migrationSource.includes("(storage.foldername(name))[2] = auth.uid()::text"));
  assert.ok(migrationSource.includes("create table public.business_documents"));
});

test("appeals table ships in the same migration with one-per-application uniqueness", () => {
  assert.ok(migrationSource.includes("create table public.appeals"));
  assert.ok(migrationSource.includes("unique (application_id)"));
  assert.ok(migrationSource.includes("create type public.appeal_status as enum"));
});
