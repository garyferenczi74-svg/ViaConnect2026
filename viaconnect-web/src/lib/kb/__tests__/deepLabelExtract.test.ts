/**
 * Deep label helpers (no live Firecrawl/Gemini).
 */

import { describe, expect, it } from "vitest";
import { extractLabelAssetUrls } from "../geminiLabelVision";
import { COMPETITIVE_SKU_SEEDS } from "../competitiveSkuSeeds";

describe("extractLabelAssetUrls", () => {
  it("scores supplement-facts image higher than logo", () => {
    const md = `
![logo](https://cdn.example.com/logo.png)
![facts](https://cdn.example.com/supplement-facts-label.jpg)
[PDF](https://cdn.example.com/product-label.pdf)
`;
    const urls = extractLabelAssetUrls(md, "https://thorne.com/products/x");
    expect(urls[0]).toMatch(/supplement-facts|label\.pdf/i);
    expect(urls.some((u) => /logo/i.test(u))).toBe(false);
  });
});

describe("expanded SKU seeds", () => {
  it("has 40+ curated product URLs", () => {
    expect(COMPETITIVE_SKU_SEEDS.length).toBeGreaterThanOrEqual(40);
  });
});
