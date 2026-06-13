// Prompt 193a (2026-06-12): data integrity tests for the GeneXM per SNP deep
// reports. Validates full coverage of the 20 GeneXM SNPs, that every report
// field is populated, that the module load merge attaches a deepReport to every
// GeneXM marker and to no other panel, and that the locked dash, bioavailability,
// and brand rules hold.

import { describe, it, expect } from "vitest";
import { GENEX_M_DEEP_REPORTS, GENEX_M_SNP_SLUGS } from "../genex-m-deep";
import { GENEX360_PANELS, PANEL_BY_SLUG } from "../panels";
import type { SnpDeepReport } from "../types";

// The 20 GeneXM SNP slugs in canonical order (lowercase gene symbols).
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

describe("GeneXM deep reports", () => {
  it("covers exactly the 20 GeneXM SNPs in canonical order", () => {
    expect(GENEX_M_SNP_SLUGS).toEqual(EXPECTED_SLUGS);
    expect(Object.keys(GENEX_M_DEEP_REPORTS)).toHaveLength(20);
  });

  it("keys match the GeneXM panel marker symbols exactly", () => {
    const markerSlugs = PANEL_BY_SLUG["genex-m"].groups
      .flatMap((group) => group.markers)
      .map((marker) => marker.symbol.toLowerCase());
    // Every GeneXM marker has a report, and there are no extra report keys.
    expect([...markerSlugs].sort()).toEqual([...EXPECTED_SLUGS].sort());
  });

  it("attaches a deepReport to every GeneXM marker via the module load merge", () => {
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
          if (variant.pendingAssayDefinition === true) {
            // Prompt 193b: a variant pending assay confirmation carries no
            // genotype tiers; its genotypes array is empty by design.
            expect(variant.genotypes.length).toBe(0);
            continue;
          }
          expect(variant.genotypes.length).toBeGreaterThan(0);
          for (const genotype of variant.genotypes) {
            // genotype.genotype may be empty for copy number style rows, but a
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

  // Prompt 193b: lock the reconciled GeneXM variant set.
  describe("193b reconciliation", () => {
    // The two stand in CALLS that must never appear as a real genotype anywhere.
    const BANNED_CALLS = ["Reference", "Variant"];

    it("has no genotype call equal to a banned stand in call in any report", () => {
      for (const report of Object.values(GENEX_M_DEEP_REPORTS)) {
        for (const variant of report.keyVariants) {
          for (const genotype of variant.genotypes) {
            expect(BANNED_CALLS).not.toContain(genotype.genotype);
          }
        }
      }
    });

    it("gates SUOX with one pending variant and empty genotypes", () => {
      const suox = GENEX_M_DEEP_REPORTS.suox;
      expect(suox.keyVariants).toHaveLength(1);
      expect(suox.keyVariants[0].pendingAssayDefinition).toBe(true);
      expect(suox.keyVariants[0].genotypes).toHaveLength(0);
    });

    it("gates ADO with one pending variant and empty genotypes", () => {
      const ado = GENEX_M_DEEP_REPORTS.ado;
      expect(ado.keyVariants).toHaveLength(1);
      expect(ado.keyVariants[0].pendingAssayDefinition).toBe(true);
      expect(ado.keyVariants[0].genotypes).toHaveLength(0);
    });

    it("gives DAO four variants including the rs2052129 promoter variant", () => {
      const dao = GENEX_M_DEEP_REPORTS.dao;
      expect(dao.keyVariants).toHaveLength(4);
      const rsids = dao.keyVariants.map((variant) => variant.rsid);
      expect(rsids).toContain("rs10156191");
      expect(rsids).toContain("rs1049742");
      expect(rsids).toContain("rs1049793");
      expect(rsids).toContain("rs2052129");
    });

    it("makes AHCY a real three variant set with no stand in calls", () => {
      const ahcy = GENEX_M_DEEP_REPORTS.ahcy;
      const rsids = ahcy.keyVariants.map((variant) => variant.rsid);
      expect(rsids).toContain("rs819147");
      expect(rsids).toContain("rs819134");
      expect(rsids).toContain("rs819171");
      for (const variant of ahcy.keyVariants) {
        for (const genotype of variant.genotypes) {
          expect(BANNED_CALLS).not.toContain(genotype.genotype);
        }
      }
    });

    it("makes ACAT1 a real rs3741049 variant with GG GA AA calls", () => {
      const acat1 = GENEX_M_DEEP_REPORTS.acat1;
      const rs3741049 = acat1.keyVariants.find((variant) => variant.rsid === "rs3741049");
      expect(rs3741049).toBeDefined();
      const calls = rs3741049 ? rs3741049.genotypes.map((genotype) => genotype.genotype) : [];
      expect(calls).toEqual(["GG", "GA", "AA"]);
    });

    it("keeps NAT2 a single derived acetylator status variant", () => {
      const nat2 = GENEX_M_DEEP_REPORTS.nat2;
      expect(nat2.keyVariants).toHaveLength(1);
      const calls = nat2.keyVariants[0].genotypes.map((genotype) => genotype.genotype);
      expect(calls).toContain("Rapid");
      expect(calls).toContain("Intermediate");
      expect(calls).toContain("Slow");
    });
  });
});
