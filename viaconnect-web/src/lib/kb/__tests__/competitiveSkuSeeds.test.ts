import { describe, expect, it } from "vitest";
import {
  augmentProductHintWithUrlDose,
  COMPETITIVE_SKU_SEEDS,
  looksLikeProductDetailUrl,
} from "../competitiveSkuSeeds";

describe("competitive SKU seeds", () => {
  it("has curated product URLs on allowlisted hosts", () => {
    expect(COMPETITIVE_SKU_SEEDS.length).toBeGreaterThanOrEqual(15);
    for (const s of COMPETITIVE_SKU_SEEDS) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(looksLikeProductDetailUrl(s.url)).toBe(true);
    }
  });

  it("rejects hub and blog paths", () => {
    expect(looksLikeProductDetailUrl("https://thorne.com/blog/methylation")).toBe(
      false
    );
    expect(looksLikeProductDetailUrl("https://thorne.com/cart")).toBe(false);
    expect(
      looksLikeProductDetailUrl("https://thorne.com/products/dp/vitamin-c")
    ).toBe(true);
  });

  it("augments productHint from URL-encoded dose only", () => {
    expect(
      augmentProductHintWithUrlDose(
        "https://www.nowfoods.com/products/vitamins/vitamin-d-3-softgels-5000-iu",
        "Vitamin D-3 Softgels"
      )
    ).toMatch(/5000\s*IU/i);
    expect(
      augmentProductHintWithUrlDose(
        "https://www.pureencapsulations.com/zinc-15.html",
        "Zinc 15"
      )
    ).toMatch(/15\s*mg/i);
    // Already has dose — do not double-append
    expect(
      augmentProductHintWithUrlDose(
        "https://www.nowfoods.com/products/minerals/zinc-picolinate-50-mg-veg-capsules",
        "Zinc Picolinate 50 mg"
      )
    ).toBe("Zinc Picolinate 50 mg");
    // No digits in URL — leave untouched (never invent)
    expect(
      augmentProductHintWithUrlDose(
        "https://www.thorne.com/products/dp/basic-b-complex",
        "Basic B Complex"
      )
    ).toBe("Basic B Complex");
  });
});
