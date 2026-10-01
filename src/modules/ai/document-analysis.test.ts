import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocumentAnalysisPrompt,
  comparableDocumentFactLabels,
  parseDocumentAnalysisResponse,
} from "./document-analysis";

const validAnalysis = {
  status: "VERIFIED",
  documentType: "BUSINESS_REGISTRATION_CERTIFICATE",
  confidence: 0.92,
  extractedFields: [
    { name: "businessName", value: "ABC SH.P.K.", sourceQuote: "Business name: ABC SH.P.K." },
    { name: "registrationNumber", value: "8123456789", sourceQuote: "Registration number 8123456789" },
  ],
  missingInformation: ["Issue date not visible"],
  inconsistencies: [{ kind: "SUSPICIOUS", description: "The issue date appears corrected." }],
  verificationNotes: "Certificate is legible and matches the applicant name.",
};

test("valid document analysis parses into the strict shape", () => {
  const parsed = parseDocumentAnalysisResponse(JSON.stringify(validAnalysis));
  assert.equal(parsed.status, "VERIFIED");
  assert.equal(parsed.documentType, "BUSINESS_REGISTRATION_CERTIFICATE");
  assert.equal(parsed.extractedFields.length, 2);
  assert.equal(parsed.inconsistencies[0]?.kind, "SUSPICIOUS");
});

test("malformed JSON is rejected, JSON embedded in prose is recovered", () => {
  assert.throws(() => parseDocumentAnalysisResponse("not json at all"), /not valid JSON/i);

  const wrapped = `Here is the result:\n${JSON.stringify(validAnalysis)}\nEnd.`;
  const parsed = parseDocumentAnalysisResponse(wrapped);
  assert.equal(parsed.status, "VERIFIED");
});

test("schema violations are rejected (hallucinated enum values, missing fields)", () => {
  assert.throws(() => parseDocumentAnalysisResponse(JSON.stringify({ ...validAnalysis, status: "APPROVED" })), /shape/i);
  assert.throws(() => parseDocumentAnalysisResponse(JSON.stringify({ ...validAnalysis, confidence: 7 })), /shape/i);
  assert.throws(
    () => parseDocumentAnalysisResponse(JSON.stringify({ ...validAnalysis, extractedFields: [{ name: "x" }] })),
    /shape/i,
  );
  assert.throws(() => parseDocumentAnalysisResponse(JSON.stringify({ status: "VERIFIED" })), /shape/i);
});

test("oversized responses are rejected to bound stored AI output", () => {
  const tooManyFields = {
    ...validAnalysis,
    extractedFields: Array.from({ length: 40 }, (_, index) => ({ name: `f${index}`, value: "v", sourceQuote: "q" })),
  };
  assert.throws(() => parseDocumentAnalysisResponse(JSON.stringify(tooManyFields)), /shape/i);
});

test("prompt forbids invention, funding decisions, and embeds document markers", () => {
  const prompt = buildDocumentAnalysisPrompt({
    fileName: "certificate.pdf",
    declaredType: "BUSINESS_REGISTRATION_CERTIFICATE",
    mimeType: "application/pdf",
    contentText: "CONTENT",
    applicationFacts: { organisationName: "ABC SH.P.K." },
  });
  assert.match(prompt, /Never invent facts/i);
  assert.match(prompt, /Never decide funding/i);
  assert.match(prompt, /NEEDS_REVIEW/);
  assert.match(prompt, /UNREADABLE/);
  assert.match(prompt, /<<<DOCUMENT/);
  assert.match(prompt, /DOCUMENT>>>/);
  assert.match(prompt, /Applicant\/organisation name: ABC SH\.P\.K\./);
  assert.match(prompt, /Respond with JSON only/);
});

test("comparable fact labels stay aligned with the consistency module", () => {
  for (const key of ["organisationName", "registrationNumber", "projectTitle", "budgetAmount", "contactName"]) {
    assert.ok(key in comparableDocumentFactLabels);
  }
});
