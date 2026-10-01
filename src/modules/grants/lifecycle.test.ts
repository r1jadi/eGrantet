import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@/lib/errors/app-error";
import { assertGrantTransition } from "./lifecycle";

test("grant lifecycle allows the intended forward transitions", () => {
  assert.doesNotThrow(() => assertGrantTransition("DRAFT", "PUBLISHED"));
  assert.doesNotThrow(() => assertGrantTransition("PUBLISHED", "CLOSED"));
  assert.doesNotThrow(() => assertGrantTransition("CLOSED", "ARCHIVED"));
});

test("grant lifecycle rejects invalid or reversing transitions", () => {
  assert.throws(() => assertGrantTransition("DRAFT", "ARCHIVED"), AppError);
  assert.throws(() => assertGrantTransition("ARCHIVED", "PUBLISHED"), AppError);
});
