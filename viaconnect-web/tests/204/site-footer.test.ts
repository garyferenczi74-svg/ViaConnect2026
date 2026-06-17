import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(__dirname, "../../src/components/layout/SiteFooter.tsx"),
  "utf8"
);

describe("SiteFooter", () => {
  it("names the entity and uses the contact mailto", () => {
    expect(src).toContain("Farmceutica Wellness LLC");
    expect(src).toContain("mailto:info@farmceuticawellness.com");
  });

  it("links to both legal routes", () => {
    expect(src).toContain('href="/privacy"');
    expect(src).toContain('href="/terms"');
  });

  it("computes the current year and is responsive", () => {
    expect(src).toContain("getFullYear()");
    expect(src).toMatch(/md:flex-row/);
  });
});
