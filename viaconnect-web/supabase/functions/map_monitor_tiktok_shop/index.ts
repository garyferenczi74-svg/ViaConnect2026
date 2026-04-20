// Prompt #101 Workstream A map_monitor_tiktok_shop
// TikTok Shop Seller Center API. Env: TIKTOK_SHOP_APP_KEY,
// TIKTOK_SHOP_APP_SECRET. Supports flash-sale flag — the DB
// suppression function honours is_flash_sale during the window.

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
  fetchL1L2Products,
  getSupabaseClient,
  jsonResponse,
  persistObservations,
  requireEnv,
} from '../_map_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'tiktok_shop');

  const supabase = getSupabaseClient();
  const ctx = { supabase, source: 'tiktok_shop' as const, parserVersion: 'tiktok_shop@1.0.0' };
  const products = await fetchL1L2Products(supabase);

  // Real Seller Center call deferred until app keys approved. Rate
  // limits matter; the shared.ts helper could gain a per-source
  // backoff wrapper in a future pass.
  for (const _product of products) {
    // Hit https://open-api.tiktokglobalshop.com/api/products/search
  }

  const inserted = await persistObservations(ctx, []);
  return jsonResponse({ observed: inserted, phase: 2 });
});
