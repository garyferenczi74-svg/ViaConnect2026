// Prompt 204 (2026-06-20): tests for the PeptideIQ EDUCATIONAL DRAFT (Phase 4).
// PeptideIQ is educational, so these lock the 14 gene entries, the EDUCATIONAL
// modeling (one keyVariant per gene, a single empty-genotype "Educational" row so
// the UI derives no tier), the absence of dashes, and the non-live gate.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PEPTIDE_IQ_DEEP_DRAFTS } from "../peptide-iq-deep.draft";
import { DEEP_REPORT_REGISTRY } from "@/lib/genex360/variantReport.config";

const PEPTIDE_IQ_ROSTER = [
  "ghr", "ghrhr", "igf1", "igfbp3", "ghrl", "ghsr", "mc4r",
  "col1a1", "col5a1", "mmp3", "vegfa", "il6", "tnf", "nos3",
];

describe("PeptideIQ educational DRAFT", () => {
  const source = readFileSync(
    path.resolve(__dirname, "..", "peptide-iq-deep.draft.ts"),
    "utf-8",
  );

  it("covers all 14 PeptideIQ genes exactly", () => {
    expect(Object.keys(PEPTIDE_IQ_DEEP_DRAFTS).sort()).toEqual(
      [...PEPTIDE_IQ_ROSTER].sort(),
    );
  });

  it("every entry has the nine sections and a laySummary", () => {
    for (const [key, r] of Object.entries(PEPTIDE_IQ_DEEP_DRAFTS)) {
      expect(r.pathway.length, `${key} pathway`).toBeGreaterThan(0);
      expect(r.biologicalRole.length, `${key} biologicalRole`).toBeGreaterThan(0);
      expect(r.functionalImpact.length, `${key} functionalImpact`).toBeGreaterThan(0);
      expect(r.healthAssociations.length, `${key} healthAssociations`).toBeGreaterThan(0);
      expect(r.nutrientStrategy.length, `${key} nutrientStrategy`).toBeGreaterThan(0);
      expect(r.cautions.length, `${key} cautions`).toBeGreaterThan(0);
      expect(r.dietLifestyle.length, `${key} dietLifestyle`).toBeGreaterThan(0);
      expect(r.interactions.length, `${key} interactions`).toBeGreaterThan(0);
      expect(r.protocolTieIn.length, `${key} protocolTieIn`).toBeGreaterThan(0);
    }
  });

  it("is EDUCATIONAL: one variant per gene, a single empty-genotype Educational row, no tier", () => {
    for (const [key, r] of Object.entries(PEPTIDE_IQ_DEEP_DRAFTS)) {
      expect(r.keyVariants.length, `${key} one keyVariant`).toBe(1);
      const v = r.keyVariants[0];
      expect(v.rsid.length, `${key} rsid`).toBeGreaterThan(0);
      expect(v.genotypes.length, `${key} one genotype row`).toBe(1);
      // Empty genotype + non-tier label so the UI derives no Typical/Moderate/High.
      expect(v.genotypes[0].genotype, `${key} empty genotype`).toBe("");
      expect(["Typical", "Moderate", "High"]).not.toContain(v.genotypes[0].label);
    }
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it("NON-LIVE GATE: not attached to markers, not registered", () => {
    expect(Object.keys(DEEP_REPORT_REGISTRY)).not.toContain("peptide-iq");
    const panelsSource = readFileSync(
      path.resolve(__dirname, "..", "panels.ts"),
      "utf-8",
    );
    expect(panelsSource).not.toContain("peptide-iq-deep.draft");
  });
});
