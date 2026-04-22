// Prompt #111 — currency-stable math primitives.

import { describe, it, expect } from "vitest";
import { sumByCurrency } from "@/lib/international/currency-math";
import type { MoneyAmount } from "@/lib/international/types";

describe("sumByCurrency", () => {
  it("groups same-currency amounts", () => {
    const amounts: MoneyAmount[] = [
      { amount_cents: 1000, currency_code: "USD" },
      { amount_cents: 2500, currency_code: "USD" },
      { amount_cents: 800,  currency_code: "EUR" },
    ];
    const totals = sumByCurrency(amounts);
    expect(totals.get("USD")).toBe(3500);
    expect(totals.get("EUR")).toBe(800);
    expect(totals.get("GBP")).toBeUndefined();
  });

  it("returns empty map for empty input", () => {
    const totals = sumByCurrency([]);
    expect(totals.size).toBe(0);
  });

  it("never mixes currencies silently", () => {
    const amounts: MoneyAmount[] = [
      { amount_cents: 100, currency_code: "USD" },
      { amount_cents: 100, currency_code: "EUR" },
      { amount_cents: 100, currency_code: "GBP" },
      { amount_cents: 100, currency_code: "AUD" },
    ];
    const totals = sumByCurrency(amounts);
    expect(totals.size).toBe(4);
    for (const [, v] of totals) expect(v).toBe(100);
  });
});
