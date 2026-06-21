// Prompt 204 (2026-06-21): contract tests for the Upload Genetic Data tabs.
// Source-as-text per the repo convention. Locks the tab set (including the
// EpigenHQ to Epigenetic rename) and that every genotype tab shows the SAME raw
// DNA dropzone (Gary 2026-06-21: each test has the same dropzone), with the
// GENEX360 auto-import and provider grid limited to the DNA tab.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PAGE = path.resolve(__dirname, "..", "page.tsx");

describe("Upload Genetic Data tabs", () => {
  const source = readFileSync(PAGE, "utf-8");

  it("has the test tabs with the EpigenHQ to Epigenetic rename and a Methylation tab", () => {
    expect(source).toContain('label: "DNA Test"');
    expect(source).toContain('label: "Methylation"');
    expect(source).toContain('label: "Nutrition"');
    expect(source).toContain('label: "Hormone"');
    expect(source).toContain('label: "Epigenetic"');
    expect(source).toContain('label: "Peptide"');
    expect(source).toContain('label: "Cannabis"');
    expect(source).not.toContain('label: "EpigenHQ"');
  });

  it("shares one upload card across the DNA and genotype tabs (PDF, photo, or data)", () => {
    // One unified card, matching the Epigenetic tab, accepting a data file, a PDF,
    // or a photo. It renders for every non-epigenetic tab.
    expect(source).toContain("UPLOAD DNA DATA, REPORT, OR PHOTO");
    expect(source).toContain("Upload data, PDF, or photo");
    // The card accepts images (photo support), not just data files and PDFs.
    expect(source).toContain("image/*");
    // The genotype tabs are no longer routed away to a separate explainer.
    expect(source).not.toContain("PanelExplainerPanel");
    // Each genotype tab still links to its blueprint panel from the intro.
    expect(source).toContain("/shop/genex360#genex-m");
    expect(source).toContain("/shop/genex360#nutrigen-dx");
    expect(source).toContain("/shop/genex360#hormone-iq");
    expect(source).toContain("/shop/genex360#peptide-iq");
    expect(source).toContain("/shop/genex360#cannabis-iq");
  });

  it("limits the GENEX360 auto-import and provider grid to the DNA tab", () => {
    expect(source).toContain('activeTab === "dna" ? (');
    expect(source).toContain("GENEX360 Auto-Import (DNA tab only)");
  });

  it("scopes each genotype tab's upload to its panel", () => {
    // The tab id is the panel_key, so a non-DNA tab passes itself as the scope.
    expect(source).toContain('activeTab === "dna" ? null : activeTab');
    expect(source).toContain('formData.append("panel", panelScope)');
    // The confirm step re-sends the scope.
    expect(source).toContain('panel: activeTab === "dna" ? undefined : activeTab');
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
