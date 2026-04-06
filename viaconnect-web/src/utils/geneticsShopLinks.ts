// src/utils/geneticsShopLinks.ts
//
// Maps Genetics Portal panel keys to deep-link queries for the Shop page.
// The shop page (src/app/(app)/(consumer)/shop/page.tsx) reads `?q=<name>`
// from the URL and pre-fills its search filter, so a deep link of
// `/shop?q=GeneX360` lands the user on the shop with that one product visible.
//
// If/when per-product detail routes (`/shop/testing-diagnostics/{slug}`) are
// added, swap the helper below to return the new URL form — every consumer
// of `getGeneticsShopUrl()` will pick up the change automatically.

/**
 * Genetics Portal panel id → shop search query.
 * Each query value is a substring guaranteed to match exactly one product
 * in MASTER_SKUS via the shop's case-insensitive name search.
 */
export const GENETICS_SHOP_QUERIES: Record<string, string> = {
  'genex360-complete': 'GeneX360',
  'genex-m':           'GeneX-M',
  'nutrigendx':        'NutrigenDX',
  'hormoneiq':         'HormoneIQ',
  'epigenhq':          'EpigenHQ',
  'peptideiq':         'PeptideIQ',
  'cannabisiq':        'CannabisIQ',
  'custom-vitamin':    '30-Day Custom Vitamin Package',
};

/**
 * Resolve a Genetics Portal panel id to a deep-link URL on the shop.
 * Falls back to the raw `productKey` as the query if the id isn't mapped,
 * which keeps unknown ids navigable to the shop with a best-effort filter.
 */
export function getGeneticsShopUrl(productKey: string): string {
  const query = GENETICS_SHOP_QUERIES[productKey] ?? productKey;
  return `/shop?q=${encodeURIComponent(query)}`;
}
