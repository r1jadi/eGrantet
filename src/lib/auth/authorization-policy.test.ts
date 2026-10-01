import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@/lib/errors/app-error";
import { assertApplicantScope, assertEvaluatorAssignment, assertMunicipalityMembership, assertRole, hasAnyRole } from "./authorization-policy";

const applicant = { id: "11111111-1111-4111-8111-111111111111", role: "APPLICANT" as const };
const employee = { id: "22222222-2222-4222-8222-222222222222", role: "MUNICIPAL_EMPLOYEE" as const };
const evaluator = { id: "33333333-3333-4333-8333-333333333333", role: "EVALUATOR" as const };

test("unauthenticated and unauthorized roles are rejected", () => { assert.throws(() => assertRole(null, ["APPLICANT"]), AppError); assert.throws(() => assertRole(applicant, ["MUNICIPAL_EMPLOYEE"]), AppError); assert.equal(hasAnyRole(applicant, ["APPLICANT"]), true); });
test("municipality scope requires employee membership", () => { assert.doesNotThrow(() => assertMunicipalityMembership(employee, true)); assert.throws(() => assertMunicipalityMembership(employee, false), AppError); assert.throws(() => assertMunicipalityMembership(applicant, true), AppError); });
test("applicant and evaluator scope checks cannot become globally permissive", () => { assert.doesNotThrow(() => assertApplicantScope(applicant, applicant.id)); assert.throws(() => assertApplicantScope(applicant, "44444444-4444-4444-8444-444444444444"), AppError); assert.doesNotThrow(() => assertEvaluatorAssignment(evaluator, true)); assert.throws(() => assertEvaluatorAssignment(evaluator, false), AppError); });
