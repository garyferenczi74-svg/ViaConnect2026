// Pricing tier resolution for the multi-portal shop.
// Consumer / Practitioner / Naturopath tiers are stored in shop_pricing_tiers
// (one row per product_slug × tier). When a tier-specific row is missing the
// caller falls back to consumer pricing, then to "Contact for Pricing".

import type { SupabaseClient } from '@supabase/supabase-js';

export type PricingTier = 'consumer' | 'practitioner' | 'naturopath';

export interface ResolvedPrice {
  /** Price in cents, or null if no pricing exists at any tier. */
  priceCents: number | null;
  /** The tier that produced the price. May fall back to consumer. */
  resolvedTier: PricingTier | null;
  /** True if we fell back from the requested tier to a different one. */
  fellBack: boolean;
}

/**
 * Resolve a product's price for the requested tier.
 * 1. Try the requested tier. If found, return it.
 * 2. If the request was practitioner/naturopath and missed, try consumer.
 * 3. If still missing, return { priceCents: null, ... }.
 */
export async function getProductPrice(
  productSlug: string,
  tier: PricingTier,
  supabase: SupabaseClient,
): Promise<ResolvedPrice> {
  // Step 1: try the requested tier
  const { data: tierRow } = await (supabase as any)
    .from('shop_pricing_tiers')
    .select('price_cents')
    .eq('product_slug', productSlug)
    .eq('tier', tier)
    .eq('is_active', true)
    .maybeSingle();

  if (tierRow?.price_cents != null) {
    return {
      priceCents: tierRow.price_cents,
      resolvedTier: tier,
      fellBack: false,
    };
  }

  // Step 2: fall back to consumer if we weren't already on it
  if (tier !== 'consumer') {
    const { data: consumerRow } = await (supabase as any)
      .from('shop_pricing_tiers')
      .select('price_cents')
      .eq('product_slug', productSlug)
      .eq('tier', 'consumer')
      .eq('is_active', true)
      .maybeSingle();

    if (consumerRow?.price_cents != null) {
      return {
        priceCents: consumerRow.price_cents,
        resolvedTier: 'consumer',
        fellBack: true,
      };
    }
  }

  // Step 3: nothing found anywhere
  return { priceCents: null, resolvedTier: null, fellBack: false };
}

/**
 * Batch-resolve prices for many slugs in one round-trip. Returns a Map keyed
 * by slug. Misses are present in the map with priceCents=null.
 */
export async function getBatchPrices(
  productSlugs: string[],
  tier: PricingTier,
  supabase: SupabaseClient,
): Promise<Map<string, ResolvedPrice>> {
  const result = new Map<string, ResolvedPrice>();
  if (productSlugs.length === 0) return result;

  // Fetch the requested tier first
  const { data: tierRows } = await (supabase as any)
    .from('shop_pricing_tiers')
    .select('product_slug, price_cents')
    .in('product_slug', productSlugs)
    .eq('tier', tier)
    .eq('is_active', true);

  const tierMap = new Map<string, number>(
    (tierRows ?? []).map((r: any) => [r.product_slug as string, r.price_cents as number]),
  );

  // Find slugs missing from the requested tier
  const missing = productSlugs.filter((s) => !tierMap.has(s));

  // Fall back to consumer for misses (only if we're not already consumer)
  let consumerMap = new Map<string, number>();
  if (tier !== 'consumer' && missing.length > 0) {
    const { data: consumerRows } = await (supabase as any)
      .from('shop_pricing_tiers')
      .select('product_slug, price_cents')
      .in('product_slug', missing)
      .eq('tier', 'consumer')
      .eq('is_active', true);
    consumerMap = new Map<string, number>(
      (consumerRows ?? []).map((r: any) => [r.product_slug as string, r.price_cents as number]),
    );
  }

  for (const slug of productSlugs) {
    if (tierMap.has(slug)) {
      result.set(slug, {
        priceCents: tierMap.get(slug)!,
        resolvedTier: tier,
        fellBack: false,
      });
    } else if (consumerMap.has(slug)) {
      result.set(slug, {
        priceCents: consumerMap.get(slug)!,
        resolvedTier: 'consumer',
        fellBack: true,
      });
    } else {
      result.set(slug, { priceCents: null, resolvedTier: null, fellBack: false });
    }
  }

  return result;
}

/**
 * Map an app role string to a pricing tier.
 * Practitioners get 'practitioner', naturopaths get 'naturopath',
 * everything else (including admin viewing the consumer portal) gets 'consumer'.
 */
export function getUserPricingTier(role: string | undefined | null): PricingTier {
  switch (role) {
    case 'practitioner':
      return 'practitioner';
    case 'naturopath':
      return 'naturopath';
    default:
      return 'consumer';
  }
}

/** Format cents as a USD price string ("$49.99" or "$1,234.00"). */
export function formatPriceCents(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
