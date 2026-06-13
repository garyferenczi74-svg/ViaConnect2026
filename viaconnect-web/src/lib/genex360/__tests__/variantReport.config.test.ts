// Prompt 193c (2026-06-12), config-driven reconciliation: tests for the single
// integration point. These lock the live route, the rsID anchor scheme, the
// registry wiring, and the label / tab slug normalization the resolver relies on.

import { describe, it, expect } from "vitest";
import {
  ANCHOR_SCHEME,
  BLUEPRINT_ROUTE,
  DEEP_REPORT_REGISTRY,
  PANEL_LABEL_TO_SLUG,
  panelSlugForLabel,
} from "../variantReport.config";

describe("variantReport.config", () => {
  it("points BLUEPRINT_ROUTE at the live standalone page", () => {
    expect(BLUEPRINT_ROUTE).toBe("/genetics/blueprint");
  });

  it("defaults the anchor scheme to rsid (the exact join)", () => {
    expect(ANCHOR_SCHEME).toBe("rsid");
  });

  it("registers the shipped GeneX-M reports keyed by gene slug", () => {
    expect(DEEP_REPORT_REGISTRY["genex-m"]).toBeDefined();
    // mthfr is a shipped GeneX-M deep report with the canonical C677T rsID.
    expect(
      DEEP_REPORT_REGISTRY["genex-m"].mthfr.keyVariants.some(
        (v) => v.rsid === "rs1801133",
      ),
    ).toBe(true);
  });

  it("maps a non hyphenated tab slug to the canonical panel slug", () => {
    expect(panelSlugForLabel("genexm")).toBe("genex-m");
    expect(panelSlugForLabel("nutrigendx")).toBe("nutrigen-dx");
  });

  it("maps a visible tab label to the canonical panel slug", () => {
    expect(panelSlugForLabel("GeneXM")).toBe("genex-m");
    expect(panelSlugForLabel("NutrigenDX")).toBe("nutrigen-dx");
  });

  it("passes an already canonical slug through unchanged via the kebab fallback", () => {
    expect(panelSlugForLabel("genex-m")).toBe("genex-m");
  });

  it("kebab cases an unknown label rather than throwing", () => {
    expect(panelSlugForLabel("Some New Panel")).toBe("some-new-panel");
  });

  it("covers all six tab slugs in the label map", () => {
    for (const slug of [
      "genexm",
      "nutrigendx",
      "hormoneiq",
      "epigenhq",
      "peptideiq",
      "cannabisiq",
    ]) {
      expect(PANEL_LABEL_TO_SLUG[slug]).toBeTruthy();
    }
  });
});
