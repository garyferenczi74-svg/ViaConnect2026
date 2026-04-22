// Prompt #111 — International multi-currency type surface.
// Every module that touches per-market pricing, currency, tax, or settlement
// imports from here so the set of known markets / currencies stays single-
// sourced.

export type MarketCode = "US" | "EU" | "UK" | "AU";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "AUD";

export const ALL_MARKETS: readonly MarketCode[] = ["US", "EU", "UK", "AU"] as const;
export const ALL_CURRENCIES: readonly CurrencyCode[] = ["USD", "EUR", "GBP", "AUD"] as const;

export const MARKET_CURRENCY: Record<MarketCode, CurrencyCode> = {
  US: "USD",
  EU: "EUR",
  UK: "GBP",
  AU: "AUD",
};

export type PricingStatus =
  | "draft"
  | "pending_governance"
  | "pending_approval"
  | "active"
  | "rejected"
  | "superseded";

export type TaxRegistrationStatus = "pending" | "active" | "suspended" | "retired";

export type VatInvoiceStatus = "draft" | "issued" | "void" | "superseded";

export type FxRateSource = "ECB" | "OANDA" | "STRIPE";

export interface MarketConfig {
  market_code: MarketCode;
  currency_code: CurrencyCode;
  inclusive_of_tax: boolean;
  enforce_88_ending: boolean;
  default_language: string;
  display_tax_label: string;
  shipping_available: boolean;
}

export interface MarketPricing {
  pricing_id: string;
  sku: string;
  market_code: MarketCode;
  currency_code: CurrencyCode;
  msrp_cents: number;
  is_available_in_market: boolean;
  margin_floor_met_at_msrp: boolean | null;
  tax_code: string;
  inclusive_of_tax: boolean;
  status: PricingStatus;
  version: number;
  effective_from: string | null;
  effective_until: string | null;
  market_availability_default_reasoning: string | null;
}

export interface FxRate {
  base_currency: CurrencyCode;
  quote_currency: CurrencyCode;
  rate: number;
  rate_source: FxRateSource;
  rate_date: string;
}

export interface MoneyAmount {
  amount_cents: number;
  currency_code: CurrencyCode;
}

export const TAX_CODE_SUPPLEMENT = "txcd_99999999";
export const TAX_CODE_SERVICE = "txcd_20030000";
export const TAX_CODE_SHIPPING = "txcd_92010001";

// Currency symbol + grouping convention. Locale concerns (, vs . decimal)
// are deferred to the localization prompt; for now display uses en-US
// convention for brand consistency.
export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
};
