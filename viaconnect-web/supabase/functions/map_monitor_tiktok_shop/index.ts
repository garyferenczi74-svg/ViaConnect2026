// Prompt #101 Workstream A map_monitor_tiktok_shop
// TikTok Shop Seller Center API. Env: TIKTOK_SHOP_APP_KEY,
// TIKTOK_SHOP_APP_SECRET. Supports flash-sale flag — the DB
// suppression function honours is_flash_sale during the window.

// deno-lint-ignore-file no-explicit-any
import {
  credentialsMissingResponse,
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
  // TODO(#101-phase-a): when TikTok Shop app keys are approved,
  // loop fetchL1L2Products(supabase) → POST
  // https://open-api.tiktokglobalshop.com/api/products/search with
  // per-source backoff; populate is_flash_sale + flash_sale_ends_at
  // from the promo banner metadata.
  const inserted = await persistObservations(ctx, []);
  return jsonResponse({ observed: inserted, phase: 2 });
});
