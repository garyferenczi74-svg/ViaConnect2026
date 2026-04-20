// Prompt #100 map_monitor_google_shopping
// Searches Google Shopping via SerpAPI for L1/L2 SKUs. Env: SERPAPI_KEY.

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
  const missing = requireEnv(['SERPAPI_KEY']);
  if (missing) return credentialsMissingResponse(missing, 'google_shopping');

  const supabase = getSupabaseClient();
  const ctx: MonitorContext = {
    supabase,
    source: 'google_shopping',
    parserVersion: 'serpapi_google_shopping@1.0.0',
  };

  const key = Deno.env.get('SERPAPI_KEY')!;
  const products = await fetchL1L2Products(supabase);
  const observations: ScrapedObservation[] = [];

  for (const product of products) {
    try {
      const q = encodeURIComponent(`${product.name} ${product.sku}`);
      const url = `https://serpapi.com/search.json?engine=google_shopping&q=${q}&api_key=${key}`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        shopping_results?: Array<{
          product_link?: string;
          extracted_price?: number;
          source?: string;
        }>;
      };
      for (const r of data.shopping_results ?? []) {
        if (!r.extracted_price || !r.product_link) continue;
        observations.push({
          productId: product.id,
          sourceUrl: r.product_link,
          observedPriceCents: Math.round(r.extracted_price * 100),
          observerConfidence: 60,
          practitionerId: null,
        });
      }
    } catch (err) {
      console.error('serpapi error', err);
    }
  }

  const inserted = await persistObservations(ctx, observations);
  return jsonResponse({ observed: inserted });
});
