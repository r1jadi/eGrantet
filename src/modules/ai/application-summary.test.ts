import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationSummaryResultSchema,
  buildApplicationSummaryPrompt,
  countSentences,
  parseApplicationSummaryResponse,
  type ApplicationSummaryFacts,
} from "./application-summary";

const baseFacts: ApplicationSummaryFacts = {
  grantTitle: "Green Neighbourhoods Fund",
  applicantName: "Lilla Szabó",
  organisationName: "District XIII Community Association",
  reference: "CG-2026-0147",
  answers: {
    projectTitle: "Pocket gardens forshared streets",
    projectDescription: "We will convert three unused courtyards into community gardens maintained by residents.",
    activities: "Soil preparation, planter building, monthly community gardening workshops.",
    beneficiaries: "Approximately 120 residents of the surrounding blocks.",
    budgetAmount: "3100",
  },
  requestedAmount: { amount: 3100, currency: "EUR" },
};

test("sentence counter counts plain 3-4 sentence summaries", () => {
  assert.equal(countSentences("One. Two. Three."), 3);
  assert.equal(countSentences("One. Two. Three. Four."), 4);
  assert.equal(countSentences("One."), 1);
});

test("sentence counter ignores common abbreviations", () => {
  assert.equal(countSentences("The project serves approx. 120 people. It runs for two years. Funding is requested."), 3);
});

test("summary schema accepts 3 sentences and rejects 2 or 5", () => {
  const three = "First sentence here. Second sentence goes on. Third sentence wraps it up.";
  assert.equal(applicationSummaryResultSchema.safeParse({ summary: three }).success, true);

  const two = "Only one more. And then a second.";
  assert.equal(applicationSummaryResultSchema.safeParse({ summary: two }).success, false);

  const five = "A. B. C. D. E.";
  assert.equal(applicationSummaryResultSchema.safeParse({ summary: five }).success, false);
});

test("summary schema rejects empty or oversized summaries", () => {
  assert.equal(applicationSummaryResultSchema.safeParse({ summary: "   " }).success, false);
  assert.equal(applicationSummaryResultSchema.safeParse({ summary: "x".repeat(2_001) }).success, false);
});

test("prompt embeds only the trusted facts and forbids invention", () => {
  const prompt = buildApplicationSummaryPrompt(baseFacts);
  assert.match(prompt, /Green Neighbourhoods Fund/);
  assert.match(prompt, /CG-2026-0147/);
  assert.match(prompt, /Pocket gardens/);
  assert.match(prompt, /3[–-]4 concise, professional sentences/);
  assert.match(prompt, /Do not invent/);
  assert.match(prompt, /Requested amount: 3100 EUR/);
});

test("prompt omits absent optional facts instead of inventing them", () => {
  const prompt = buildApplicationSummaryPrompt({ ...baseFacts, applicantName: null, organisationName: null, requestedAmount: null });
  assert.doesNotMatch(prompt, /Applicant:/);
  assert.doesNotMatch(prompt, /Organisation:/);
  assert.doesNotMatch(prompt, /Requested amount:/);
});

test("prompt renders missing answers as explicitly absent", () => {
  const prompt = buildApplicationSummaryPrompt({ ...baseFacts, answers: {} });
  assert.match(prompt, /no free-text answers were submitted/);
});

test("parser accepts valid JSON with a conforming summary", () => {
  const parsed = parseApplicationSummaryResponse(JSON.stringify({ summary: "First. Second. Third." }));
  assert.equal(parsed.summary, "First. Second. Third.");
});

test("parser tolerates fenced JSON blocks", () => {
  const fenced = "```json\n{\"summary\": \"One sentence here. Another follows now. A third closes it.\"}\n```";
  const parsed = parseApplicationSummaryResponse(fenced);
  assert.match(parsed.summary, /One sentence here/);
});

test("parser rejects malformed and misshapen AI output", () => {
  assert.throws(() => parseApplicationSummaryResponse("not json at all"), /JSON/);
  assert.throws(() => parseApplicationSummaryResponse(JSON.stringify({ text: "First. Second. Third." })), /shape/);
  assert.throws(() => parseApplicationSummaryResponse(JSON.stringify({ summary: "Too short. Only two." })), /shape/);
  assert.throws(() => parseApplicationSummaryResponse("{}"), /shape/);
});
