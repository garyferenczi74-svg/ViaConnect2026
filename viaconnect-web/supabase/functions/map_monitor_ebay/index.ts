// Prompt #100 map_monitor_ebay
// Searches eBay active listings via eBay Finding API.
// Env: EBAY_APP_ID, EBAY_CERT_ID.

import {
  credentialsMissingResponse,
  fetchL1L2Products,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
  type MonitorContext,
  type ScrapedObservation,
} from '../_map_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['EBAY_APP_ID', 'EBAY_CERT_ID']);
  if (missing) return credentialsMissingResponse(missing, 'ebay');

  const supabase = getSupabaseClient();
  const ctx: MonitorContext = {
    supabase,
    source: 'ebay',
    parserVersion: 'ebay_finding@1.0.0',
  };

  const appId = Deno.env.get('EBAY_APP_ID')!;
  const products = await fetchL1L2Products(supabase);
  const observations: ScrapedObservation[] = [];

  for (const product of products) {
    try {
      const q = encodeURIComponent(`${product.name} ${product.sku}`);
      const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.13.0&SECURITY-APPNAME=${appId}&RESPONSE-DATA-FORMAT=JSON&keywords=${q}`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        findItemsByKeywordsResponse?: Array<{
          searchResult?: Array<{
            item?: Array<{
              viewItemURL?: string[];
              sellingStatus?: Array<{ currentPrice?: Array<{ __value__?: string }> }>;
            }>;
          }>;
        }>;
      };
      const items = data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item ?? [];
      for (const item of items) {
        const price = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__;
        const link = item.viewItemURL?.[0];
        if (!price || !link) continue;
        observations.push({
          productId: product.id,
          sourceUrl: link,
          observedPriceCents: Math.round(parseFloat(price) * 100),
          observerConfidence: 55,
          practitionerId: null,
        });
      }
    } catch (err) {
      console.error('ebay error', err);
    }
  }

  const inserted = await persistObservations(ctx, observations);
  return jsonResponse({ observed: inserted });
});
