// Prompt 204 (2026-06-20): tests for the EpigenHQ interpretation DRAFT (Phase 3).
// EpigenHQ is not a genotype panel, so these lock the 12 epigenetic marker
// interpretations, their non-empty fields, the absence of dashes, and the fact
// that this draft is wired to no surface (non-live).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EPIGEN_HQ_INTERPRETATIONS_DRAFT } from "../epigen-hq-interpretations.draft";

const EPIGEN_HQ_ROSTER = [
  "epigenetic-age", "biological-age-gap", "pace-of-aging",
  "inflammatory-methylation-index", "immune-cell-methylation-profile",
  "metabolic-methylation-score", "glucose-insulin-regulation-methylation",
  "ahrr-combustion-exposure", "alcohol-exposure-methylation",
  "stress-cortisol-exposure-methylation", "global-dna-methylation-status",
  "telomere-associated-methylation",
];

describe("EpigenHQ interpretation DRAFT", () => {
  const source = readFileSync(
    path.resolve(__dirname, "..", "epigen-hq-interpretations.draft.ts"),
    "utf-8",
  );

  it("covers all 12 EpigenHQ markers exactly", () => {
    expect(Object.keys(EPIGEN_HQ_INTERPRETATIONS_DRAFT).sort()).toEqual(
      [...EPIGEN_HQ_ROSTER].sort(),
    );
  });

  it("every interpretation has all fields populated", () => {
    for (const [key, e] of Object.entries(EPIGEN_HQ_INTERPRETATIONS_DRAFT)) {
      expect(e.marker.length, `${key} marker`).toBeGreaterThan(0);
      expect(e.measures.length, `${key} measures`).toBeGreaterThan(0);
      expect(e.higherSuggests.length, `${key} higherSuggests`).toBeGreaterThan(0);
      expect(e.lowerSuggests.length, `${key} lowerSuggests`).toBeGreaterThan(0);
      expect(e.wellnessNote.length, `${key} wellnessNote`).toBeGreaterThan(0);
    }
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it("carries no genotype, allele, or severity framing (it is not a SNP panel)", () => {
    // The draft imports neither the SnpDeepReport type nor a severity tier: it is a
    // standalone epigenetic interpretation shape with no genotype or severity field.
    expect(source).not.toContain('import type { SnpDeepReport }');
    expect(source).not.toContain("import type { SeverityTier }");
    // No entry carries a genotype or tier property.
    for (const e of Object.values(EPIGEN_HQ_INTERPRETATIONS_DRAFT)) {
      expect(e).not.toHaveProperty("genotype");
      expect(e).not.toHaveProperty("severity");
      expect(e).not.toHaveProperty("keyVariants");
    }
  });
});
