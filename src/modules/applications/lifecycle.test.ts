import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@/lib/errors/app-error";
import { assertApplicationTransition } from "./lifecycle";

test("application lifecycle accepts review and decision paths", () => {
  assert.doesNotThrow(() => assertApplicationTransition("DRAFT", "SUBMITTED"));
  assert.doesNotThrow(() => assertApplicationTransition("SUBMITTED", "UNDER_REVIEW"));
  assert.doesNotThrow(() => assertApplicationTransition("UNDER_REVIEW", "CORRECTION_REQUESTED"));
  assert.doesNotThrow(() => assertApplicationTransition("UNDER_REVIEW", "APPROVED"));
  assert.doesNotThrow(() => assertApplicationTransition("UNDER_REVIEW", "REJECTED"));
});

test("application lifecycle blocks skipping review and changing final decisions", () => {
  assert.throws(() => assertApplicationTransition("DRAFT", "APPROVED"), AppError);
  assert.throws(() => assertApplicationTransition("APPROVED", "UNDER_REVIEW"), AppError);
});
