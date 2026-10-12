import assert from "node:assert/strict";
import test from "node:test";
import { getPrivacyContent, getTermsContent } from "./legal-content";

test("privacy and terms exist in all three locales with real content", () => {
  for (const locale of ["en", "sq", "sr"] as const) {
    const privacy = getPrivacyContent(locale);
    const terms = getTermsContent(locale);
    assert.match(privacy.title, /privac|privatës|privatnost/i);
    assert.ok(privacy.sections.length >= 8, `${locale} privacy needs full sections`);
    assert.ok(terms.sections.length >= 8, `${locale} terms needs full sections`);
    for (const section of [...privacy.sections, ...terms.sections]) {
      assert.ok(section.heading.length > 2, "section heading must be real text");
      assert.ok(section.paragraphs.length >= 1, "section needs at least one paragraph");
      for (const paragraph of section.paragraphs) {
        assert.ok(paragraph.length > 40, "paragraphs must be substantive, not placeholders");
        assert.ok(!/lorem|TODO|FIXME|\[insert/i.test(paragraph), "no placeholder text allowed");
      }
    }
  }
});

test("legal pages describe the real service honestly", () => {
  const privacy = getPrivacyContent("en");
  const body = privacy.sections.map((section) => section.paragraphs.join(" ")).join(" ");
  assert.ok(/supabase/i.test(body), "privacy names the real storage provider");
  assert.ok(/cookie/i.test(body), "privacy documents cookies");
  assert.ok(/human/i.test(body), "privacy states humans decide funding");
  assert.ok(!/official government website/i.test(body), "no false official-status claim");

  const terms = getTermsContent("en");
  const termsBody = terms.sections.map((section) => section.paragraphs.join(" ")).join(" ");
  assert.ok(/human/i.test(termsBody), "terms state humans make funding decisions");
  assert.ok(/must not|prohibit/i.test(termsBody), "terms cover abuse rules");
});

test("unknown locales fall back to English", () => {
  assert.equal(getPrivacyContent("fr" as never).title, getPrivacyContent("en").title);
  assert.equal(getTermsContent("fr" as never).title, getTermsContent("en").title);
});
