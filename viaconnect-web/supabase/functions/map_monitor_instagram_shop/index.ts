// Prompt #100 map_monitor_instagram_shop
// Polls Instagram Graph API / Commerce API product feeds.
// Env: INSTAGRAM_GRAPH_ACCESS_TOKEN, META_APP_SECRET.

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
  const missing = requireEnv(['INSTAGRAM_GRAPH_ACCESS_TOKEN', 'META_APP_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'instagram_shop');

  const supabase = getSupabaseClient();
  const ctx: MonitorContext = {
    supabase,
    source: 'instagram_shop',
    parserVersion: 'instagram_graph@1.0.0',
  };

  const products = await fetchL1L2Products(supabase);
  const observations: ScrapedObservation[] = [];

  // Production implementation fetches /me/commerce_accounts/products
  // per verified practitioner and extracts price fields. Skipped until
  // Meta App review + verified Commerce accounts linked to practitioners.
  for (const _product of products) {
    // Deferred: Commerce API call.
  }

  const inserted = await persistObservations(ctx, observations);
  return jsonResponse({ observed: inserted });
});
