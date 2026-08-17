import { describe, expect, it } from "vitest";
import {
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
});
