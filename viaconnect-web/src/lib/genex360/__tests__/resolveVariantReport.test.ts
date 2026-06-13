// Prompt 193c (2026-06-12): tests for the Your Variants to Blueprint report join.
// The resolver reads the merged deep reports (PANEL_BY_SLUG), so these assertions
// depend on the shipped GeneX-M reports, not on the sample data.

import { describe, it, expect } from "vitest";
import { resolveVariantReport, BLUEPRINT_ROUTE } from "../resolveVariantReport";

describe("resolveVariantReport", () => {
  it("centralizes the Blueprint route", () => {
    expect(BLUEPRINT_ROUTE).toBe("/genetics/blueprint");
  });

  it("resolves a GeneXM tab variant by rsID to its gene report with a Scheme A href", () => {
    const target = resolveVariantReport("rs1801133", "genexm");
    expect(target.exists).toBe(true);
    expect(target.panelSlug).toBe("genex-m");
    expect(target.geneSlug).toBe("mthfr");
    expect(target.rsid).toBe("rs1801133");
    expect(target.href).toBe("/genetics/blueprint#genex-m/mthfr?v=rs1801133");
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
    // MAT1A rs7087728 appears in the GeneXM sample but has no GeneX-M deep report.
    const target = resolveVariantReport("rs7087728", "genexm");
    expect(target.exists).toBe(false);
    expect(target.href).toBe("");
  });

  it("returns exists false for a panel whose reports have not shipped", () => {
    // FUT2 rs601338 is in the NutrigenDX sample; NutriGen-DX deep reports are not
    // built yet, and the rsID is not in any shipped panel, so there is no report.
    expect(resolveVariantReport("rs601338", "nutrigendx").exists).toBe(false);
  });

  it("returns exists false for an unknown rsID", () => {
    expect(resolveVariantReport("rs00000000", "genexm").exists).toBe(false);
  });

  it("returns exists false for an empty rsID", () => {
    expect(resolveVariantReport("", "genexm").exists).toBe(false);
  });
});
