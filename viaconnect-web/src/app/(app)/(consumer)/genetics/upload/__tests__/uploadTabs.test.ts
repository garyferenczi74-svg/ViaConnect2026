// Prompt 204 (2026-06-21): contract tests for the Upload Genetic Data tabs.
// Source-as-text per the repo convention. Locks the tab set (including the
// EpigenHQ to Epigenetic rename) and that the four genotype tabs explain + route
// to the DNA upload rather than offering a duplicate dropzone.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PAGE = path.resolve(__dirname, "..", "page.tsx");
const EXPLAINER = path.resolve(
  __dirname,
  "..", "..", "..", "..", "..", "..",
  "components", "genetics", "upload", "PanelExplainerPanel.tsx",
);

describe("Upload Genetic Data tabs", () => {
  const source = readFileSync(PAGE, "utf-8");

  it("has the six test tabs with the EpigenHQ to Epigenetic rename", () => {
    expect(source).toContain('label: "DNA Test"');
    expect(source).toContain('label: "Nutrition"');
    expect(source).toContain('label: "Hormone"');
    expect(source).toContain('label: "Epigenetic"');
    expect(source).toContain('label: "Peptide"');
    expect(source).toContain('label: "Cannabis"');
    // The old tab label is gone.
    expect(source).not.toContain('label: "EpigenHQ"');
  });

  it("routes the genotype explainer tabs to the DNA upload", () => {
    expect(source).toContain("PanelExplainerPanel");
    expect(source).toContain('onUseDnaUpload={() => setActiveTab("dna")}');
    // Each genotype explainer points at its blueprint panel.
    expect(source).toContain("/shop/genex360#nutrigen-dx");
    expect(source).toContain("/shop/genex360#hormone-iq");
    expect(source).toContain("/shop/genex360#peptide-iq");
    expect(source).toContain("/shop/genex360#cannabis-iq");
  });

  it("keeps the Epigenetic tab on its own measured-report upload", () => {
    expect(source).toContain("EpigenUploadPanel");
    expect(source).toContain('activeTab === "epigen"');
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe("PanelExplainerPanel", () => {
  const source = readFileSync(EXPLAINER, "utf-8");

  it("offers the DNA upload route and a blueprint link, no dropzone", () => {
    expect(source).toContain("Go to DNA Test upload");
    expect(source).toContain("View on your blueprint");
    expect(source).not.toContain("type=\"file\"");
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
