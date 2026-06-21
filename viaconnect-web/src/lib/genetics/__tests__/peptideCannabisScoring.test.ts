// Prompt 204 (2026-06-21): PeptideIQ + CannabisIQ genotype scoring, after Gary's
// sign-off reversed their educational only status. Verifies the engine now produces
// these panels' variants from an upload, the scored tiers resolve (including the
// load-bearing AKT1 orientation), and the deliberately unscored SNPs stay unscored.

import { describe, it, expect } from "vitest";
import { CLINICAL_SNP_BY_RSID } from "../clinicalSnps";
import { analyzeVariants } from "../dnaAnalysisEngine";
import { severityFor } from "../variantSeverity";
import { PANEL_LABELS } from "../panelLabels";

describe("engine coverage", () => {
  it("annotates the peptide and cannabis canonical rsIDs on their panel", () => {
    const akt1 = CLINICAL_SNP_BY_RSID["rs2494732"];
    expect(akt1).toBeDefined();
    expect(akt1.panel_key).toBe("cannabis");
    expect(akt1.gene).toBe("AKT1");
    expect(akt1.riskAllele).toBe("C"); // verified vs dbSNP + Di Forti 2012
    expect(CLINICAL_SNP_BY_RSID["rs17782313"].panel_key).toBe("peptide");
    expect(CLINICAL_SNP_BY_RSID["rs1057910"].panel_key).toBe("cannabis");
  });

  it("produces a scored-panel variant from an uploaded genotype", () => {
    const out = analyzeVariants([
      { rsid: "rs2494732", chromosome: "14", position: "1", genotype: "CC" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].panel_key).toBe("cannabis");
    expect(out[0].status).toBe("+/+"); // two copies of the C risk allele
  });
});

describe("severity tiers (scoped by panel slug)", () => {
  const PEPTIDE = PANEL_LABELS["peptide"].slug;
  const CANNABIS = PANEL_LABELS["cannabis"].slug;

  it("maps the panel keys to the expected slugs", () => {
    expect(PEPTIDE).toBe("peptide-iq");
    expect(CANNABIS).toBe("cannabis-iq");
  });

  it("scores AKT1 with C as the risk allele (orientation locked)", () => {
    expect(severityFor(CANNABIS, "rs2494732", "CC")).toBe("high");
    expect(severityFor(CANNABIS, "rs2494732", "CT")).toBe("moderate");
    expect(severityFor(CANNABIS, "rs2494732", "TC")).toBe("moderate");
    expect(severityFor(CANNABIS, "rs2494732", "TT")).toBe("low");
  });

  it("scores the pharmacogenomic and COMT tiers", () => {
    expect(severityFor(CANNABIS, "rs1057910", "CC")).toBe("high"); // CYP2C9*3/*3
    expect(severityFor(CANNABIS, "rs1057910", "AC")).toBe("moderate");
    expect(severityFor(CANNABIS, "rs35599367", "TT")).toBe("moderate"); // CYP3A4*22
    expect(severityFor(CANNABIS, "rs4680", "AA")).toBe("moderate"); // COMT Met/Met only
    expect(severityFor(CANNABIS, "rs4680", "GA")).toBe("low"); // one copy not scored
  });

  it("scores the three peptide tiers in either heterozygous order", () => {
    expect(severityFor(PEPTIDE, "rs17782313", "CC")).toBe("moderate");
    expect(severityFor(PEPTIDE, "rs17782313", "TT")).toBe("low");
    expect(severityFor(PEPTIDE, "rs1800012", "GT")).toBe("moderate");
    expect(severityFor(PEPTIDE, "rs1800012", "TG")).toBe("moderate");
    expect(severityFor(PEPTIDE, "rs1799983", "TT")).toBe("moderate");
  });

  it("leaves the deliberately unscored SNPs unscored (null)", () => {
    expect(severityFor(CANNABIS, "rs1800497", "CT")).toBeNull(); // DRD2/ANKK1
    expect(severityFor(CANNABIS, "rs324420", "AA")).toBeNull(); // FAAH
    expect(severityFor(CANNABIS, "rs1049353", "AA")).toBeNull(); // CNR1
    expect(severityFor(PEPTIDE, "rs6184", "CC")).toBeNull(); // GHR
    expect(severityFor(PEPTIDE, "rs2010963", "CC")).toBeNull(); // VEGFA
  });
});
