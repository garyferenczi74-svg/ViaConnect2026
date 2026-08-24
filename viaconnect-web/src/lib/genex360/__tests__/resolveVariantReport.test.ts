// Prompt 193c (2026-06-12): tests for the Your Variants to Blueprint report join.
// The resolver reads the DEEP_REPORT_REGISTRY (config-driven), so these
// assertions depend on the shipped GeneXM reports, not on the sample data. The
// route now lives in variantReport.config.ts (the single integration point).

import { describe, it, expect } from "vitest";
import { resolveVariantReport } from "../resolveVariantReport";
import { BLUEPRINT_ROUTE } from "../variantReport.config";

describe("resolveVariantReport", () => {
  it("centralizes the Blueprint route", () => {
    expect(BLUEPRINT_ROUTE).toBe("/genetics/blueprint");
  });

  it("resolves a GeneXM tab variant by rsID to its gene report with a nested 3 segment href", () => {
    const target = resolveVariantReport("rs1801133", "genexm");
    expect(target.exists).toBe(true);
    expect(target.panelSlug).toBe("genex-m");
    expect(target.geneSlug).toBe("mthfr");
    expect(target.rsid).toBe("rs1801133");
    expect(target.href).toBe("/genetics/blueprint#genex-m/mthfr/rs1801133");
  });

  it("maps the non hyphenated tab slug to the hyphenated panel slug", () => {
    // COMT rs4680 resolves to the genex-m comt report.
    const target = resolveVariantReport("rs4680", "genexm");
    expect(target.exists).toBe(true);
    expect(target.panelSlug).toBe("genex-m");
    expect(target.geneSlug).toBe("comt");
  });

  it("accepts an already hyphenated panel slug (passthrough)", () => {
    const target = resolveVariantReport("rs1801133", "genex-m");
    expect(target.exists).toBe(true);
    expect(target.geneSlug).toBe("mthfr");
  });

  it("returns exists false (no pill) for a variant with no matching report", () => {
    // MAT1A rs7087728 appears in the GeneXM sample but has no GeneXM deep report.
    const target = resolveVariantReport("rs7087728", "genexm");
    expect(target.exists).toBe(false);
    expect(target.href).toBe("");
  });

  it("resolves a NutrigenDX variant now that its reports have shipped (go-live 2026-06-20)", () => {
    // FUT2 rs601338 is a NutrigenDX keyVariant, and NutrigenDX is now registered,
    // so the Report pill resolves to its gene report.
    const target = resolveVariantReport("rs601338", "nutrigendx");
    expect(target.exists).toBe(true);
    expect(target.panelSlug).toBe("nutrigen-dx");
    expect(target.geneSlug).toBe("fut2");
    expect(target.level).toBe("variant");
  });

  it("returns exists false for a truly unknown rsID on a shipped panel", () => {
    expect(resolveVariantReport("rs00000000", "nutrigendx").exists).toBe(false);
  });

  it("returns exists false for an unknown rsID", () => {
    expect(resolveVariantReport("rs00000000", "genexm").exists).toBe(false);
  });

  it("returns exists false for an empty rsID", () => {
    expect(resolveVariantReport("", "genexm").exists).toBe(false);
  });

  it("gene-level fallback: a non-keyVariant rsID still links to its gene report (204i)", () => {
    // rs1802059 (MTRR A664A) is not a keyVariant of any shipped report, but the
    // MTRR gene has a GeneXM deep report, so the variant links to that gene report.
    const target = resolveVariantReport("rs1802059", "genex-m", "MTRR");
    expect(target.exists).toBe(true);
    expect(target.geneSlug).toBe("mtrr");
    expect(target.href).toBe("/genetics/blueprint#genex-m/mtrr/rs1802059");
    expect(target.level).toBe("gene");
  });

  it("gene-level fallback does not fire when the gene has no deep report", () => {
    expect(resolveVariantReport("rs1802059", "genex-m", "NOTAGENE").exists).toBe(false);
    // And without a gene argument the fallback never fires.
    expect(resolveVariantReport("rs1802059", "genex-m").exists).toBe(false);
  });

  it("prefers the exact keyVariant match over the gene-level fallback", () => {
    // rs1801133 IS a keyVariant of MTHFR; the exact-match path is used.
    const target = resolveVariantReport("rs1801133", "genex-m", "MTHFR");
    expect(target.exists).toBe(true);
    expect(target.geneSlug).toBe("mthfr");
    expect(target.level).toBe("variant");
  });

  it("resolves MTHFR folate only through genex-m, never nutrigen-dx", () => {
    const fromNutrition = resolveVariantReport("rs1801133", "nutrigendx", "MTHFR");
    expect(fromNutrition.exists).toBe(true);
    expect(fromNutrition.panelSlug).toBe("genex-m");
    expect(fromNutrition.geneSlug).toBe("mthfr");
    expect(fromNutrition.href).toBe("/genetics/blueprint#genex-m/mthfr/rs1801133");
  });
});
