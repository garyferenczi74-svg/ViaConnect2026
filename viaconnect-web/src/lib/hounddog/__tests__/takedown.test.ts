import { describe, it, expect } from "vitest";
import { draftTakedown } from "../takedown";

describe("draftTakedown", () => {
  it("produces Amazon Brand Registry template", () => {
    const body = draftTakedown({
      findingId: "M-2026-0423-0001",
      platform: "Amazon",
      listingUrl: "https://amazon.com/dp/XYZ",
      mechanism: "amazon_brand_registry",
      sku: "FARM-METH-30",
      authorHandle: "shady-seller",
    });
    expect(body).toContain("AMAZON BRAND REGISTRY");
    expect(body).toContain("FARM-METH-30");
    expect(body).toContain("M-2026-0423-0001");
  });

  it("produces DMCA template", () => {
    const body = draftTakedown({
      findingId: "M-2026-0423-0002",
      platform: "website",
      listingUrl: "https://bad-site.com/knockoff",
      mechanism: "dmca_takedown",
    });
    expect(body).toContain("DMCA 512(c)");
    expect(body).toContain("good faith belief");
  });

  it("never references auto-send verbs", () => {
    const body = draftTakedown({
      findingId: "M-1",
      platform: "eBay",
      listingUrl: "https://ebay.com/itm/1",
      mechanism: "ebay_vero",
    });
    expect(body.toLowerCase()).not.toMatch(/auto[- ]?submitt(ed|ing)/);
    expect(body.toLowerCase()).not.toMatch(/auto[- ]?send/);
  });
});
