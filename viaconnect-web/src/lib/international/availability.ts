// Prompt #111 — Market availability resolver + cart gate.
// Cart-level check (§9): if ANY SKU in the cart has
// is_available_in_market=FALSE for the shipping-address market, checkout is
// hard-blocked. No partial-cart fulfillment.

import { createClient } from "@/lib/supabase/client";
import type { MarketCode } from "./types";

export interface CartAvailabilityResult {
  ok: boolean;
  blockedSkus: string[];
}

export async function isSkuAvailableInMarket(
  sku: string,
  market: MarketCode,
): Promise<boolean> {
  const sb = createClient();
  const { data, error } = await sb
    .from("master_skus_market_pricing")
    .select("is_available_in_market")
    .eq("sku", sku)
    .eq("market_code", market)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return false;
  return (data as { is_available_in_market: boolean }).is_available_in_market === true;
}

export async function checkCartAvailability(
  cartSkus: readonly string[],
  market: MarketCode,
): Promise<CartAvailabilityResult> {
  if (cartSkus.length === 0) return { ok: true, blockedSkus: [] };
  const sb = createClient();
  const { data, error } = await sb
    .from("master_skus_market_pricing")
    .select("sku, is_available_in_market")
    .in("sku", cartSkus as string[])
    .eq("market_code", market)
    .eq("status", "active");
  if (error || !data) return { ok: false, blockedSkus: [...cartSkus] };
  const availableSet = new Set<string>();
  for (const row of data) {
    const r = row as { sku: string; is_available_in_market: boolean };
    if (r.is_available_in_market) availableSet.add(r.sku);
  }
  const blocked = cartSkus.filter((s) => !availableSet.has(s));
  return { ok: blocked.length === 0, blockedSkus: blocked };
}
