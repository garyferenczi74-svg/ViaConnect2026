// Prompt 204 (2026-06-20): tests for the CannabisIQ EDUCATIONAL DRAFT (Phase 5).
// CannabisIQ is educational, so these lock the 10 gene entries, the EDUCATIONAL
// modeling (one keyVariant per gene, a single empty-genotype "Educational" row so
// the UI derives no tier), the cannabis-education-not-advice framing, the absence
// of dashes, and the non-live gate.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CANNABIS_IQ_DEEP_DRAFTS } from "../cannabis-iq-deep.draft";
import { DEEP_REPORT_REGISTRY } from "@/lib/genex360/variantReport.config";

const CANNABIS_IQ_ROSTER = [
  "cnr1", "cnr2", "faah", "mgll", "cyp2c9", "cyp3a4", "abcb1", "comt", "akt1", "drd2",
];

describe("CannabisIQ educational DRAFT", () => {
  const source = readFileSync(
    path.resolve(__dirname, "..", "cannabis-iq-deep.draft.ts"),
    "utf-8",
  );

  it("covers all 10 CannabisIQ genes exactly", () => {
    expect(Object.keys(CANNABIS_IQ_DEEP_DRAFTS).sort()).toEqual(
      [...CANNABIS_IQ_ROSTER].sort(),
    );
  });

  it("every entry has the nine sections and a laySummary", () => {
    for (const [key, r] of Object.entries(CANNABIS_IQ_DEEP_DRAFTS)) {
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
    for (const [key, r] of Object.entries(CANNABIS_IQ_DEEP_DRAFTS)) {
      expect(r.keyVariants.length, `${key} one keyVariant`).toBe(1);
      const v = r.keyVariants[0];
      expect(v.genotypes.length, `${key} one genotype row`).toBe(1);
      expect(v.genotypes[0].genotype, `${key} empty genotype`).toBe("");
      expect(["Typical", "Moderate", "High"]).not.toContain(v.genotypes[0].label);
    }
  });

  it("frames every entry as cannabis education, not advice (a caution per entry)", () => {
    for (const [key, r] of Object.entries(CANNABIS_IQ_DEEP_DRAFTS)) {
      const hasNotARecommendation = r.cautions.some((c) =>
        c.includes("not a recommendation") || c.includes("risk awareness marker"),
      );
      expect(hasNotARecommendation, `${key} carries the not-a-recommendation caution`).toBe(true);
    }
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it("NON-LIVE GATE: not attached to markers, not registered", () => {
    expect(Object.keys(DEEP_REPORT_REGISTRY)).not.toContain("cannabis-iq");
    const panelsSource = readFileSync(
      path.resolve(__dirname, "..", "panels.ts"),
      "utf-8",
    );
    expect(panelsSource).not.toContain("cannabis-iq-deep.draft");
  });
});
