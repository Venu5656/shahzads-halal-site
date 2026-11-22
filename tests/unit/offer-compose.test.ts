import { describe, expect, it } from "vitest";
import { fieldErrorsFrom } from "@/lib/auth/schemas";
import { MAX_PARAGRAPHS, offerSchema } from "@/lib/offers/compose";

const valid = {
  subject: "Free fries this week",
  heading: "Free fries this week",
  body: "Order any platter before Sunday and the fries are on us.\n\nNo code, nothing to show — it's already on.",
  buttonLabel: "See the menu",
  url: "/menu",
};

describe("writing an offer", () => {
  it("splits what he typed into paragraphs on blank lines", () => {
    const r = offerSchema.parse(valid);
    expect(r.body).toEqual([
      "Order any platter before Sunday and the fries are on us.",
      "No code, nothing to show — it's already on.",
    ]);
  });

  it("joins a paragraph that was wrapped by the textarea", () => {
    // A single newline is the box wrapping, not a new paragraph.
    const r = offerSchema.parse({ ...valid, body: "One idea\nsplit over\ntwo lines.\n\nNext." });
    expect(r.body).toEqual(["One idea split over two lines.", "Next."]);
  });

  it("handles the CRLF a browser actually submits from a textarea", () => {
    // The HTML spec says a textarea submits with CRLF line endings. Splitting
    // on bare newlines finds no blank line in .\r\n\r\nb.\ at all, so the
    // whole offer arrives as one paragraph — which is what used to happen.
    const r = offerSchema.parse({ ...valid, body: "First.\r\n\r\nSecond." });
    expect(r.body).toEqual(["First.", "Second."]);
  });

  it("ignores stray blank lines rather than making empty paragraphs", () => {
    const r = offerSchema.parse({ ...valid, body: "\n\n\nFirst.\n\n\n\nSecond.\n\n\n" });
    expect(r.body).toEqual(["First.", "Second."]);
  });

  it("refuses an empty offer, however it is empty", () => {
    for (const body of ["", "   ", "\n\n\n"]) {
      expect(offerSchema.safeParse({ ...valid, body }).success).toBe(false);
    }
  });

  it("stops him writing a newsletter", () => {
    const body = Array.from({ length: MAX_PARAGRAPHS + 1 }, (_, i) => `Para ${i}.`).join("\n\n");
    const r = offerSchema.safeParse({ ...valid, body });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).body).toMatch(/paragraphs/);
  });

  it("takes a path on this site or a full https link, and nothing else", () => {
    expect(offerSchema.safeParse({ ...valid, url: "/menu" }).success).toBe(true);
    expect(offerSchema.safeParse({ ...valid, url: "https://example.com/x" }).success).toBe(true);
    // http:// and javascript: are both refused — the second is why this check
    // exists at all, since the value ends up in an href.
    for (const url of ["http://example.com", "javascript:alert(1)", "menu", "//evil.test"]) {
      expect(offerSchema.safeParse({ ...valid, url }).success).toBe(false);
    }
  });

  it("needs every field, not just the words", () => {
    for (const key of ["subject", "heading", "buttonLabel", "url"] as const) {
      const r = offerSchema.safeParse({ ...valid, [key]: "  " });
      expect(r.success).toBe(false);
      if (!r.success) expect(fieldErrorsFrom(r.error)[key]).toBeDefined();
    }
  });
});
