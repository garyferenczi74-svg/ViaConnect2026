// Prompt 204 (2026-06-20): tests for the NutrigenDX clinical content DRAFT.
//
// These lock the two things that matter for an unvalidated clinical draft:
// (1) every authored entry is well formed against the SnpDeepReport shape and
// the standing rules (nine prose sections present, no dashes), and (2) the
// NON-LIVE GATE holds, the draft is NOT attached to panel markers and NOT
// registered, so nothing reaches a user before the human clinical and compliance
// gate. The full 27 SNP roster coverage is tracked as the phase completion driver.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NUTRIGEN_DX_DEEP_DRAFTS } from "../nutrigen-dx-deep.draft";
import { NUTRIGEN_DX_SEVERITY_DRAFT } from "@/lib/genetics/drafts/nutrigenDxSeverityDraft";
import { DEEP_REPORT_REGISTRY } from "@/lib/genex360/variantReport.config";
import { normalizeGenotype } from "@/lib/genetics/variantSeverity";

// The 27 NutrigenDX SNP roster (lowercased symbol slugs), from panels.ts. HLA-DQ2
// and HLA-DQ8 share one marker; GSTM1 and GSTT1 are null deletion loci. The
// authored draft keys must be a subset of this set and, at phase completion,
// equal it.
const NUTRIGEN_DX_ROSTER = [
  "mthfr", "fads1", "tcn2", "vdr", "slc23a1", "slc30a8", "fut2", "gc", "pemt",
  "apoa2", "fto", "amy1", "lipc", "tcf7l2", "sod2", "gpx1", "il6", "tnf",
  "gstm1", "gstt1", "cat", "mcm6", "hla-dq2-and-hla-dq8", "ahr", "dao", "nat2",
  "abcg2",
];

describe("NutrigenDX deep report DRAFT", () => {
  const draftSource = readFileSync(
    path.resolve(__dirname, "..", "nutrigen-dx-deep.draft.ts"),
    "utf-8",
  );

  it("has at least the FTO exemplar authored", () => {
    expect(Object.keys(NUTRIGEN_DX_DEEP_DRAFTS).length).toBeGreaterThan(0);
    expect(NUTRIGEN_DX_DEEP_DRAFTS.fto).toBeDefined();
  });

  it("every authored entry is well formed (nine sections, valid keyVariants)", () => {
    for (const [key, report] of Object.entries(NUTRIGEN_DX_DEEP_DRAFTS)) {
      expect(NUTRIGEN_DX_ROSTER, `${key} is a NutrigenDX roster symbol`).toContain(key);
      expect(report.pathway.length, `${key} pathway`).toBeGreaterThan(0);
      expect(report.biologicalRole.length, `${key} biologicalRole`).toBeGreaterThan(0);
      expect(report.functionalImpact.length, `${key} functionalImpact`).toBeGreaterThan(0);
      expect(report.healthAssociations.length, `${key} healthAssociations`).toBeGreaterThan(0);
      expect(report.nutrientStrategy.length, `${key} nutrientStrategy`).toBeGreaterThan(0);
      expect(report.cautions.length, `${key} cautions`).toBeGreaterThan(0);
      expect(report.dietLifestyle.length, `${key} dietLifestyle`).toBeGreaterThan(0);
      expect(report.interactions.length, `${key} interactions`).toBeGreaterThan(0);
      expect(report.protocolTieIn.length, `${key} protocolTieIn`).toBeGreaterThan(0);
      expect(Array.isArray(report.keyVariants), `${key} keyVariants`).toBe(true);
      for (const variant of report.keyVariants) {
        expect(variant.rsid.length, `${key} variant rsid`).toBeGreaterThan(0);
        expect(variant.name.length, `${key} variant name`).toBeGreaterThan(0);
        for (const g of variant.genotypes) {
          expect(g.label.length, `${key} genotype label`).toBeGreaterThan(0);
          expect(g.interpretation.length, `${key} genotype interpretation`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("contains no em or en dashes in the draft source", () => {
    expect(draftSource.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(draftSource.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it("NON-LIVE GATE: the draft is not attached to markers and not registered", () => {
    // The Report pill / blueprint only render a panel's reports when that panel is
    // in DEEP_REPORT_REGISTRY. The draft must NOT be there yet (only on the human
    // gate). Today the registry holds only genex-m.
    expect(Object.keys(DEEP_REPORT_REGISTRY)).not.toContain("nutrigen-dx");
    // And the draft module name is not imported by panels.ts (the attach loop).
    const panelsSource = readFileSync(
      path.resolve(__dirname, "..", "panels.ts"),
      "utf-8",
    );
    expect(panelsSource).not.toContain("nutrigen-dx-deep.draft");
  });
});

describe("NutrigenDX severity DRAFT", () => {
  it("keys severity by rsID then normalized genotype to a valid tier", () => {
    for (const [rsid, byGenotype] of Object.entries(NUTRIGEN_DX_SEVERITY_DRAFT)) {
      expect(rsid).toBe(rsid.toLowerCase());
      for (const [genotype, tier] of Object.entries(byGenotype)) {
        expect(genotype).toBe(genotype.toUpperCase());
        expect(["high", "moderate", "low"]).toContain(tier);
      }
    }
  });

  it("no two genotype keys collapse under the live normalizeGenotype lookup", () => {
    // The live severityFor uppercases and strips separators. Two keys that
    // normalize to the same token (for example the F/f Fok1 shorthand) would
    // silently collide and break scoring, so each variant's keys must stay
    // distinct after normalization.
    for (const [rsid, byGenotype] of Object.entries(NUTRIGEN_DX_SEVERITY_DRAFT)) {
      const normalized = Object.keys(byGenotype).map((g) => normalizeGenotype(g));
      expect(new Set(normalized).size, `${rsid} keys collide after normalize`).toBe(
        normalized.length,
      );
    }
  });

  it("NON-LIVE GATE: the severity draft is not merged into VARIANT_SEVERITY", () => {
    const liveSource = readFileSync(
      path.resolve(__dirname, "..", "..", "..", "lib", "genetics", "variantSeverity.ts"),
      "utf-8",
    );
    expect(liveSource).not.toContain("nutrigenDxSeverityDraft");
    expect(liveSource).not.toContain("NUTRIGEN_DX_SEVERITY_DRAFT");
  });
});

describe("NutrigenDX roster coverage (phase completion)", () => {
  it("covers all 27 NutrigenDX SNPs exactly", () => {
    expect(Object.keys(NUTRIGEN_DX_DEEP_DRAFTS).sort()).toEqual(
      [...NUTRIGEN_DX_ROSTER].sort(),
    );
  });
});
