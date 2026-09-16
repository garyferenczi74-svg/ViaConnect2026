import { describe, expect, it } from "vitest";
import {
  hasPeptideDeliveryOptions,
  stripPeptideDeliveryOptions,
} from "../strip-peptide-delivery";

describe("stripPeptideDeliveryOptions", () => {
  it("strips deliveryOptions_raw from a peptide payload", () => {
    const input = {
      name: "Sermorelin",
      summary: "educational only",
      deliveryOptions_raw: [
        { route: "injectable", mcg: 200 },
        { route: "oral", mg: 5 },
      ],
    };
    const out = stripPeptideDeliveryOptions(input);
    expect(out).toEqual({ name: "Sermorelin", summary: "educational only" });
    expect("deliveryOptions_raw" in out).toBe(false);
    expect(input.deliveryOptions_raw).toHaveLength(2);
  });

  it("strips similar delivery option keys nested in arrays", () => {
    const input = {
      results: [
        {
          slug: "retatrutide",
          delivery_options: [{ mcg: 1 }],
          deliveryOptions: [{ mg: 2 }],
          educational_only: true as const,
        },
      ],
    };
    const out = stripPeptideDeliveryOptions(input);
    expect(out.results[0]).toEqual({ slug: "retatrutide", educational_only: true });
    expect(hasPeptideDeliveryOptions(out)).toBe(false);
    expect(hasPeptideDeliveryOptions(input)).toBe(true);
  });

  it("does not strip engine protocol dosage strings", () => {
    const input = {
      items: [{ productName: "MTHFR+", dosage: "1 capsule", bucket: "morning" }],
    };
    expect(stripPeptideDeliveryOptions(input)).toEqual(input);
  });
});
