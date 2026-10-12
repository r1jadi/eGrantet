import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Wiring lock: every server action that triggers provider AI calls must
 * enforce a per-client budget, so one actor cannot burn the organization's
 * shared Groq free-tier quota (or budget) unchecked. Follows the same
 * source-guard style as the service-role import boundary test.
 */
async function source(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), ...relativePath.split("/")), "utf8");
}

test("every AI-triggering action enforces a scoped per-client budget", async () => {
  const cases: Array<[string, string]> = [
    ["src/modules/verification/actions/verification-actions.ts", "ai:verification:"],
    ["src/modules/applications/actions/application-summary-actions.ts", "ai:summary:"],
    ["src/modules/applications/actions/decision-letter-actions.ts", "ai:letter:"],
  ];
  for (const [file, budget] of cases) {
    const content = await source(file);
    assert.ok(content.includes("enforceRateLimit"), `${file} must rate-limit provider AI usage`);
    assert.ok(content.includes(budget), `${file} must scope its AI budget (${budget})`);
  }
});

test("document analysis pre-flights vision inputs for the text-only default model", async () => {
  const adapter = await source("src/modules/ai/openai-document-analysis.ts");
  assert.ok(adapter.includes("isVisionDocument"), "adapter must guard vision inputs before any provider call");
});
