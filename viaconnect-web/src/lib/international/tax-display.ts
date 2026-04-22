// Prompt #111 — Currency + tax-inclusive price rendering.
// Defers localization (comma vs period decimals) to a later prompt; for now
// uses en-US convention for brand consistency across markets (§19 open).

import type { CurrencyCode, MarketConfig } from "./types";
import { CURRENCY_SYMBOL } from "./types";

export interface DisplayedPrice {
  text: string;
  taxSuffix: string | null;
}

export function formatPrice(
  amountCents: number,
  currency: CurrencyCode,
  marketConfig: Pick<MarketConfig, "inclusive_of_tax" | "display_tax_label"> | null = null,
): DisplayedPrice {
  const major = amountCents / 100;
  const formatted = major.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOL[currency];
  const text = `${symbol}${formatted}`;
  const taxSuffix =
    marketConfig && marketConfig.inclusive_of_tax
      ? ` incl. ${marketConfig.display_tax_label}`
      : null;
  return { text, taxSuffix };
}
