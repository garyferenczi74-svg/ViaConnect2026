// Prompt 204 (2026-06-20): tests for the HormoneIQ clinical content DRAFT (Phase 2).
// Locks the 5 genotype SNP entries, their structure, the severity normalize
// safety, and the NON-LIVE gate (not attached, not registered, not merged).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { HORMONE_IQ_DEEP_DRAFTS } from "../hormone-iq-deep.draft";
import { HORMONE_IQ_SEVERITY_DRAFT } from "@/lib/genetics/drafts/hormoneIqSeverityDraft";
import { DEEP_REPORT_REGISTRY } from "@/lib/genex360/variantReport.config";
import { normalizeGenotype } from "@/lib/genetics/variantSeverity";

// The 5 HormoneIQ genotype SNPs. The other 24 markers are biomarkers (lab track).
const HORMONE_IQ_SNP_ROSTER = ["comt", "cyp1a1", "cyp1b1", "cyp19a1", "srd5a2"];

describe("HormoneIQ deep report DRAFT", () => {
  const draftSource = readFileSync(
    path.resolve(__dirname, "..", "hormone-iq-deep.draft.ts"),
    "utf-8",
  );

  it("covers exactly the 5 HormoneIQ genotype SNPs", () => {
    expect(Object.keys(HORMONE_IQ_DEEP_DRAFTS).sort()).toEqual(
      [...HORMONE_IQ_SNP_ROSTER].sort(),
    );
  });

  it("every entry is well formed (nine sections, valid keyVariants)", () => {
    for (const [key, report] of Object.entries(HORMONE_IQ_DEEP_DRAFTS)) {
      expect(report.pathway.length, `${key} pathway`).toBeGreaterThan(0);
      expect(report.biologicalRole.length, `${key} biologicalRole`).toBeGreaterThan(0);
      expect(report.functionalImpact.length, `${key} functionalImpact`).toBeGreaterThan(0);
      expect(report.healthAssociations.length, `${key} healthAssociations`).toBeGreaterThan(0);
      expect(report.nutrientStrategy.length, `${key} nutrientStrategy`).toBeGreaterThan(0);
      expect(report.cautions.length, `${key} cautions`).toBeGreaterThan(0);
      expect(report.dietLifestyle.length, `${key} dietLifestyle`).toBeGreaterThan(0);
      expect(report.interactions.length, `${key} interactions`).toBeGreaterThan(0);
      expect(report.protocolTieIn.length, `${key} protocolTieIn`).toBeGreaterThan(0);
      for (const variant of report.keyVariants) {
        expect(variant.rsid.length, `${key} rsid`).toBeGreaterThan(0);
        for (const g of variant.genotypes) {
          expect(g.label.length, `${key} label`).toBeGreaterThan(0);
          expect(g.interpretation.length, `${key} interpretation`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("contains no em or en dashes in the draft source", () => {
    expect(draftSource.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(draftSource.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it("severity keys are uppercase and do not collapse under normalizeGenotype", () => {
    for (const [rsid, byGenotype] of Object.entries(HORMONE_IQ_SEVERITY_DRAFT)) {
      expect(rsid).toBe(rsid.toLowerCase());
      const normalized = Object.keys(byGenotype).map((g) => normalizeGenotype(g));
      expect(new Set(normalized).size, `${rsid} keys collide`).toBe(normalized.length);
      for (const [genotype, tier] of Object.entries(byGenotype)) {
        expect(genotype).toBe(genotype.toUpperCase());
        expect(["high", "moderate", "low"]).toContain(tier);
      }
    }
  });

  it("NON-LIVE GATE: not attached to markers, not registered, not merged", () => {
    expect(Object.keys(DEEP_REPORT_REGISTRY)).not.toContain("hormone-iq");
    const panelsSource = readFileSync(
      path.resolve(__dirname, "..", "panels.ts"),
      "utf-8",
    );
    expect(panelsSource).not.toContain("hormone-iq-deep.draft");
    const liveSeverity = readFileSync(
      path.resolve(__dirname, "..", "..", "..", "lib", "genetics", "variantSeverity.ts"),
      "utf-8",
    );
    expect(liveSeverity).not.toContain("hormoneIqSeverityDraft");
  });
});
