// Prompt: GeneX360 purchase seeding. Tests for isGenexBundlePurchase, the pure
// predicate that decides whether an order's lines include the GeneX360 bundle.
// No Stripe and no Supabase: this is a pure function over cart lines.

import { describe, it, expect } from "vitest";
import { isGenexBundlePurchase } from "../seedSamplePanels";

describe("isGenexBundlePurchase", () => {
  it("returns true for the complete bundle slug", () => {
    expect(
      isGenexBundlePurchase([
        { productType: "testing", productSlug: "genex360-complete" },
      ]),
    ).toBe(true);
  });

  it("returns true for any genex360 testing slug", () => {
    expect(
      isGenexBundlePurchase([
        { productType: "testing", productSlug: "genex360-core" },
      ]),
    ).toBe(true);
  });

  it("returns false for supplements only", () => {
    expect(
      isGenexBundlePurchase([
        { productType: "supplement", productSlug: "fc-xyz" },
      ]),
    ).toBe(false);
  });

  it("returns false for a testing line that is not genex360", () => {
    expect(
      isGenexBundlePurchase([
        { productType: "testing", productSlug: "some-other-test" },
      ]),
    ).toBe(false);
  });

  it("returns false for an empty cart", () => {
    expect(isGenexBundlePurchase([])).toBe(false);
  });
});
