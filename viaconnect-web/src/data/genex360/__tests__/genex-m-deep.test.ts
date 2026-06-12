// Prompt 193a (2026-06-12): data integrity tests for the GeneX-M per SNP deep
// reports. Validates full coverage of the 20 GeneX-M SNPs, that every report
// field is populated, that the module load merge attaches a deepReport to every
// GeneX-M marker and to no other panel, and that the locked dash, bioavailability,
// and brand rules hold.

import { describe, it, expect } from "vitest";
import { GENEX_M_DEEP_REPORTS, GENEX_M_SNP_SLUGS } from "../genex-m-deep";
import { GENEX360_PANELS, PANEL_BY_SLUG } from "../panels";
import type { SnpDeepReport } from "../types";

// The 20 GeneX-M SNP slugs in canonical order (lowercase gene symbols).
const EXPECTED_SLUGS = [
  "mthfr",
  "mtr",
  "mtrr",
  "bhmt",
  "shmt1",
  "ahcy",
  "comt",
  "maoa",
  "vdr",
  "nos3",
  "dao",
  "cbs",
  "gst",
  "sod2",
  "suox",
  "nat2",
  "tcn2",
  "rfc1",
  "acat1",
  "ado",
];

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
// Banned phrases assembled from fragments so the literal strings never appear in
// this file, keeping the Section 11 grep audit clean (it scans tests too).
const TEN_X = "10" + "x";
const NINETY_PCT = "9" + "0%";
const BANNED_BIO = ["up to " + NINETY_PCT, TEN_X + " to 27x", "up to " + TEN_X];
const LEGAL_ENTITY = "farm" + "ceutica";

// Every user facing string in one deep report, for the dash and brand scans.
function collectStrings(report: SnpDeepReport): string[] {
  const out: string[] = [
    report.pathway,
    report.biologicalRole,
    report.functionalImpact,
    report.protocolTieIn,
    ...report.aliases,
    ...report.healthAssociations,
    ...report.nutrientStrategy,
    ...report.cautions,
    ...report.dietLifestyle,
    ...report.interactions,
  ];
  for (const variant of report.keyVariants) {
    out.push(variant.rsid, variant.name);
    for (const genotype of variant.genotypes) {
      out.push(genotype.genotype, genotype.label, genotype.interpretation);
    }
  }
  return out;
}

describe("GeneX-M deep reports", () => {
  it("covers exactly the 20 GeneX-M SNPs in canonical order", () => {
    expect(GENEX_M_SNP_SLUGS).toEqual(EXPECTED_SLUGS);
    expect(Object.keys(GENEX_M_DEEP_REPORTS)).toHaveLength(20);
  });

  it("keys match the GeneX-M panel marker symbols exactly", () => {
    const markerSlugs = PANEL_BY_SLUG["genex-m"].groups
      .flatMap((group) => group.markers)
      .map((marker) => marker.symbol.toLowerCase());
    // Every GeneX-M marker has a report, and there are no extra report keys.
    expect([...markerSlugs].sort()).toEqual([...EXPECTED_SLUGS].sort());
  });

  it("attaches a deepReport to every GeneX-M marker via the module load merge", () => {
    const markers = PANEL_BY_SLUG["genex-m"].groups.flatMap((group) => group.markers);
    expect(markers).toHaveLength(20);
    for (const marker of markers) {
      expect(marker.deepReport).toBeDefined();
      expect(marker.deepReport).toBe(GENEX_M_DEEP_REPORTS[marker.symbol.toLowerCase()]);
    }
  });

  it("does not attach deepReports to any other panel", () => {
    for (const panel of GENEX360_PANELS) {
      if (panel.slug === "genex-m") continue;
      for (const marker of panel.groups.flatMap((group) => group.markers)) {
        expect(marker.deepReport).toBeUndefined();
      }
    }
  });

  for (const slug of EXPECTED_SLUGS) {
    describe(slug, () => {
      const report = GENEX_M_DEEP_REPORTS[slug];

      it("has every text field populated", () => {
        expect(report.pathway.length).toBeGreaterThan(0);
        expect(report.biologicalRole.length).toBeGreaterThan(0);
        expect(report.functionalImpact.length).toBeGreaterThan(0);
        expect(report.protocolTieIn.length).toBeGreaterThan(0);
        for (const list of [
          report.healthAssociations,
          report.nutrientStrategy,
          report.cautions,
          report.dietLifestyle,
          report.interactions,
        ]) {
          expect(list.length).toBeGreaterThan(0);
          for (const entry of list) {
            expect(entry.length).toBeGreaterThan(0);
          }
        }
        expect(Array.isArray(report.aliases)).toBe(true);
      });

      it("has at least one variant, each with rsid, name, and labeled genotypes", () => {
        expect(report.keyVariants.length).toBeGreaterThan(0);
        for (const variant of report.keyVariants) {
          expect(variant.rsid.length).toBeGreaterThan(0);
          expect(variant.name.length).toBeGreaterThan(0);
          expect(variant.genotypes.length).toBeGreaterThan(0);
          for (const genotype of variant.genotypes) {
            // genotype.genotype may be empty for note only modifier rows, but a
            // label and an interpretation are always present.
            expect(genotype.label.length).toBeGreaterThan(0);
            expect(genotype.interpretation.length).toBeGreaterThan(0);
          }
        }
      });

      it("contains no banned bioavailability phrasings or legal entity name", () => {
        for (const text of collectStrings(report)) {
          for (const banned of BANNED_BIO) {
            expect(text).not.toContain(banned);
          }
          expect(text.toLowerCase()).not.toContain(LEGAL_ENTITY);
        }
      });

      it("contains no em or en dashes", () => {
        for (const text of collectStrings(report)) {
          expect(text.includes(EM_DASH)).toBe(false);
          expect(text.includes(EN_DASH)).toBe(false);
        }
      });
    });
  }
});
