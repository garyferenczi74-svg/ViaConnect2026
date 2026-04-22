// Prompt #111 — Per-market pricing reader.
// Every place the app renders a SKU price resolves through getMarketPricing()
// so <PriceDisplay /> is the only rendering surface. Unknown (sku,market)
// combinations return null; the UI renders a "Not available in your region"
// treatment for null.

import { createClient } from "@/lib/supabase/client";
import type { MarketCode, MarketPricing } from "./types";

export async function getMarketPricing(
  sku: string,
  market: MarketCode,
): Promise<MarketPricing | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from("master_skus_market_pricing")
    .select(
      "pricing_id, sku, market_code, currency_code, msrp_cents, is_available_in_market, margin_floor_met_at_msrp, tax_code, inclusive_of_tax, status, version, effective_from, effective_until, market_availability_default_reasoning",
    )
    .eq("sku", sku)
    .eq("market_code", market)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as MarketPricing;
}

export async function getMarketPricingBulk(
  skus: readonly string[],
  market: MarketCode,
): Promise<Map<string, MarketPricing>> {
  if (skus.length === 0) return new Map();
  const sb = createClient();
  const { data, error } = await sb
    .from("master_skus_market_pricing")
    .select(
      "pricing_id, sku, market_code, currency_code, msrp_cents, is_available_in_market, margin_floor_met_at_msrp, tax_code, inclusive_of_tax, status, version, effective_from, effective_until, market_availability_default_reasoning",
    )
    .in("sku", skus as string[])
    .eq("market_code", market)
    .eq("status", "active");
  const map = new Map<string, MarketPricing>();
  if (error || !data) return map;
  for (const row of data) map.set((row as { sku: string }).sku, row as unknown as MarketPricing);
  return map;
}
