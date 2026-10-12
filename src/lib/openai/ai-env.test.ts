import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TIMEOUT_MS,
  GROQ_BASE_URL,
  GROQ_DEFAULT_MODEL,
  getAiBaseUrl,
  getAiModel,
  getAiTimeoutMs,
} from "./ai-env";

/** Runs `fn` with the given env vars applied, restoring everything after. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key] as string;
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key] as string;
    }
  }
}

test("provider base URL defaults to GroqCloud", () => {
  withEnv({ AI_BASE_URL: undefined }, () => {
    assert.equal(getAiBaseUrl(), GROQ_BASE_URL);
    assert.equal(getAiBaseUrl(), "https://api.groq.com/openai/v1");
  });
  withEnv({ AI_BASE_URL: "   " }, () => {
    assert.equal(getAiBaseUrl(), GROQ_BASE_URL);
  });
});

test("provider base URL honors an explicit override", () => {
  withEnv({ AI_BASE_URL: "  https://custom-gateway.example/v1  " }, () => {
    assert.equal(getAiBaseUrl(), "https://custom-gateway.example/v1");
  });
});

test("model defaults to the Groq free-tier model", () => {
  withEnv({ AI_MODEL: undefined }, () => {
    assert.equal(getAiModel(), GROQ_DEFAULT_MODEL);
    assert.equal(getAiModel(), "openai/gpt-oss-20b");
    assert.equal(getAiModel("   "), GROQ_DEFAULT_MODEL);
  });
});

test("model precedence is feature override, then AI_MODEL, then default", () => {
  withEnv({ AI_MODEL: "custom/model" }, () => {
    assert.equal(getAiModel(), "custom/model");
    assert.equal(getAiModel("feature/model"), "feature/model");
    assert.equal(getAiModel("  "), "custom/model");
  });
  withEnv({ AI_MODEL: "   " }, () => {
    assert.equal(getAiModel(), GROQ_DEFAULT_MODEL);
  });
});

test("timeout defaults and honors valid overrides only", () => {
  withEnv({ OPENAI_AI_TIMEOUT_MS: undefined }, () => {
    assert.equal(getAiTimeoutMs(), DEFAULT_TIMEOUT_MS);
    assert.equal(getAiTimeoutMs(), 30_000);
  });
  withEnv({ OPENAI_AI_TIMEOUT_MS: "5000" }, () => {
    assert.equal(getAiTimeoutMs(), 5_000);
  });
  for (const invalid of ["0", "-100", "abc", "NaN", "Infinity", "   "]) {
    withEnv({ OPENAI_AI_TIMEOUT_MS: invalid }, () => {
      assert.equal(getAiTimeoutMs(), DEFAULT_TIMEOUT_MS, `override ${JSON.stringify(invalid)} must fall back`);
    });
  }
  withEnv({ OPENAI_AI_TIMEOUT_MS: "5000" }, () => {
    assert.equal(getAiTimeoutMs("8000"), 8_000);
  });
});
