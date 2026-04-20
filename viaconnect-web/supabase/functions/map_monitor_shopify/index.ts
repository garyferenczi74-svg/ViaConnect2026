// Prompt #100 map_monitor_shopify
// Polls Shopify Admin API (GraphQL) for each verified practitioner
// storefront. Env: SHOPIFY_ADMIN_ACCESS_TOKEN per practitioner stored
// in Vault; SHOPIFY_API_VERSION pinned at 2026-01.

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
  const missing = requireEnv(['SHOPIFY_API_VERSION']);
  if (missing) return credentialsMissingResponse(missing, 'shopify');

  const supabase = getSupabaseClient();
  const ctx: MonitorContext = {
    supabase,
    source: 'shopify',
    parserVersion: 'shopify_admin@2026-01',
  };

  const products = await fetchL1L2Products(supabase);
  const observations: ScrapedObservation[] = [];

  // Real call: for each practitioner_verified_channels row of
  // type='shopify', GraphQL to /admin/api/2026-01/graphql.json
  // querying products(query: "sku:{sku}") { variants { price } }.
  for (const _product of products) {
    // Deferred until verified channel table + per-practitioner
    // encrypted Shopify tokens land.
  }

  const inserted = await persistObservations(ctx, observations);
  return jsonResponse({ observed: inserted });
});
