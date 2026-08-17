/**
 * Deep label helpers (no live Firecrawl/Gemini).
 */

import { describe, expect, it } from "vitest";
import { extractLabelAssetUrls } from "../geminiLabelVision";
import { COMPETITIVE_SKU_SEEDS } from "../competitiveSkuSeeds";
import { materializeScreenshotToBase64 } from "@/lib/hounddog/firecrawl/client";
import { normalizeProductUrl } from "../enrichCompetitiveProducts";

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

describe("materializeScreenshotToBase64", () => {
  it("strips data-url prefix", async () => {
    // 1x1 PNG base64 (valid length after strip > 200 for real use; short rejects)
    const tiny = "data:image/png;base64,iVBORw0KGgo=";
    const out = await materializeScreenshotToBase64(tiny);
    // Too short after strip → undefined (Gemini needs real image bytes)
    expect(out).toBeUndefined();
  });

  it("accepts long bare base64", async () => {
    const bare = "A".repeat(600);
    const out = await materializeScreenshotToBase64(bare);
    expect(out).toBe(bare);
  });

  it("returns undefined for empty", async () => {
    expect(await materializeScreenshotToBase64("")).toBeUndefined();
    expect(await materializeScreenshotToBase64(null)).toBeUndefined();
  });
});

describe("expanded SKU seeds", () => {
  it("has 40+ curated product URLs", () => {
    expect(COMPETITIVE_SKU_SEEDS.length).toBeGreaterThanOrEqual(40);
  });
});

describe("normalizeProductUrl for seed enrich matching", () => {
  it("strips www, query, hash, trailing slash", () => {
    expect(
      normalizeProductUrl(
        "https://www.thorne.com/products/dp/vitamin-d-5000/?utm=1#facts"
      )
    ).toBe("thorne.com/products/dp/vitamin-d-5000");
    expect(
      normalizeProductUrl("https://thorne.com/products/dp/vitamin-d-5000/")
    ).toBe("thorne.com/products/dp/vitamin-d-5000");
  });
});
