import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import robots from "./robots";
import sitemap from "./sitemap";

const PRODUCTION_URL = "https://egrantet.vercel.app";

test("robots points to the production sitemap and hides private areas", () => {
  const config = robots();
  assert.equal(config.sitemap, `${PRODUCTION_URL}/sitemap.xml`);
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  const flat = rules.flatMap((rule) => [
    ...(typeof rule.allow === "string" ? [rule.allow] : (rule.allow ?? [])),
    ...(typeof rule.disallow === "string" ? [rule.disallow] : (rule.disallow ?? [])),
  ]);
  for (const publicPath of ["/", "/grants", "/privacy", "/terms"]) {
    assert.ok(flat.includes(publicPath), `${publicPath} must be crawlable`);
  }
  for (const privatePath of ["/admin", "/municipality", "/evaluator", "/applications", "/api/"]) {
    assert.ok(flat.includes(privatePath), `${privatePath} must be disallowed`);
  }
});

test("sitemap lists only canonical public pages, never private data", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);
  for (const expected of [`${PRODUCTION_URL}/`, `${PRODUCTION_URL}/grants`, `${PRODUCTION_URL}/privacy`, `${PRODUCTION_URL}/terms`]) {
    assert.ok(urls.includes(expected), `${expected} must be in the sitemap`);
  }
  for (const url of urls) {
    assert.ok(!url.includes("/admin"), `sitemap must not expose admin URLs: ${url}`);
    assert.ok(!url.includes("/applications/"), `sitemap must not expose applications: ${url}`);
    assert.ok(!url.includes("/api/"), `sitemap must not expose API routes: ${url}`);
    assert.ok(url.startsWith(PRODUCTION_URL), `sitemap URLs must use the production domain: ${url}`);
  }
});

test("root layout sets production metadataBase and eGrantet title template", async () => {
  const layout = await readFile(path.join(process.cwd(), "src", "app", "layout.tsx"), "utf8");
  assert.ok(layout.includes("NEXT_PUBLIC_SITE_URL"), "metadataBase must come from the public site URL");
  assert.ok(layout.includes("https://egrantet.vercel.app"), "production URL must be the fallback");
  assert.ok(layout.includes('"%s | eGrantet"'), "title template must use the eGrantet brand");
});

test("protected areas opt out of search indexing", async () => {
  const privateLayouts = [
    path.join("src", "app", "(account)", "layout.tsx"),
    path.join("src", "app", "(admin)", "layout.tsx"),
    path.join("src", "app", "(applicant)", "layout.tsx"),
    path.join("src", "app", "(evaluator)", "layout.tsx"),
    path.join("src", "app", "(municipality)", "layout.tsx"),
  ];
  for (const relative of privateLayouts) {
    const content = await readFile(path.join(process.cwd(), relative), "utf8");
    assert.ok(content.includes("index: false"), `${relative} must set robots noindex`);
  }
});
