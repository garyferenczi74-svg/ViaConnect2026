// Prompt #101 Workstream A map_monitor_walmart
// Walmart Marketplace Seller API for known sellers + SerpAPI walmart
// endpoint for anonymous listings. Env: WALMART_PARTNER_CLIENT_ID,
// WALMART_PARTNER_CLIENT_SECRET, SERPAPI_KEY.

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
  type ScrapedObservation,
} from '../_map_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['WALMART_PARTNER_CLIENT_ID', 'WALMART_PARTNER_CLIENT_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'walmart');

  const supabase = getSupabaseClient();
  const ctx = { supabase, source: 'walmart' as const, parserVersion: 'walmart_partner@1.0.0' };
  // TODO(#101-phase-a): when Walmart Partner API credentials + seller
  // ID mapping land, loop over fetchL1L2Products(supabase) and call
  // https://marketplace.walmartapis.com/v3/items?sku={sku} per item.
  const observations: ScrapedObservation[] = [];
  const inserted = await persistObservations(ctx, observations);
  return jsonResponse({ observed: inserted, phase: 2 });
});
