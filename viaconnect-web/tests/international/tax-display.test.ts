// Prompt #111 — price formatting with inclusive/exclusive tax display.

import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/international/tax-display";

describe("formatPrice", () => {
  it("formats USD exclusive (no suffix when market config null)", () => {
    const { text, taxSuffix } = formatPrice(5888, "USD", null);
    expect(text).toBe("$58.88");
    expect(taxSuffix).toBeNull();
  });

  it("adds VAT suffix when market config is inclusive", () => {
    const { text, taxSuffix } = formatPrice(4688, "GBP", { inclusive_of_tax: true, display_tax_label: "VAT" });
    expect(text).toBe("£46.88");
    expect(taxSuffix).toBe(" incl. VAT");
  });

  it("adds GST suffix for AU inclusive market", () => {
    const { text, taxSuffix } = formatPrice(8988, "AUD", { inclusive_of_tax: true, display_tax_label: "GST" });
    expect(text).toBe("A$89.88");
    expect(taxSuffix).toBe(" incl. GST");
  });

  it("omits suffix when market config present but inclusive_of_tax false", () => {
    const { taxSuffix } = formatPrice(5888, "USD", { inclusive_of_tax: false, display_tax_label: "Sales Tax" });
    expect(taxSuffix).toBeNull();
  });

  it("uses correct currency symbol per currency", () => {
    expect(formatPrice(100, "USD", null).text).toBe("$1.00");
    expect(formatPrice(100, "EUR", null).text).toBe("€1.00");
    expect(formatPrice(100, "GBP", null).text).toBe("£1.00");
    expect(formatPrice(100, "AUD", null).text).toBe("A$1.00");
  });
});
