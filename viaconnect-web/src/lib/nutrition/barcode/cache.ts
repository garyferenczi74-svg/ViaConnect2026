/**
 * Prompt 170l Phase 1a: Open Food Facts product cache with stale-while-revalidate.
 *
 * Server-side cache layer between /api/nutrition/barcode/lookup and the OFF API.
 * 7-day TTL per spec §3.4. Cold rows (no hits in 90 days) purged nightly via
 * the Phase 1b Edge Function. hit_count + last_hit_at updated on every read.
 *
 * Stale-while-revalidate semantics:
 *   - Row exists, expires_at > now: fresh hit, return immediately.
 *   - Row exists, expires_at <= now: stale hit, return stale immediately AND
 *     caller fires background revalidation to keep response latency tight.
 *   - Row absent: miss, caller fetches OFF.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import type { OFFProduct } from '@/lib/nutrition/databases/open-food-facts';
import type { CachedOFFProduct } from './types';
import { BARCODE_OFF_CACHE_TTL_DAYS } from './feature-flags';

const CACHE_TABLE = 'off_product_cache';

export interface CacheReadResult {
  product: CachedOFFProduct | null;
  isStale: boolean;
}

export async function getCachedProduct(
  barcode: string,
  requestId: string,
): Promise<CacheReadResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) {
    safeLog.warn('nutrition.barcode.cache.read_error', 'cache read failed', {
      request_id: requestId,
      barcode,
      error: error.message,
    });
    return { product: null, isStale: false };
  }

  if (!data) {
    return { product: null, isStale: false };
  }

  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  const isStale = expiresAt <= now;

  // Fire-and-forget hit_count update; do not await.
  void supabase
    .from(CACHE_TABLE)
    .update({
      hit_count: (data.hit_count ?? 0) + 1,
      last_hit_at: now.toISOString(),
    })
    .eq('barcode', barcode);

  return { product: data as CachedOFFProduct, isStale };
}

export async function setCachedProduct(
  product: OFFProduct,
  requestId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + BARCODE_OFF_CACHE_TTL_DAYS);

  const { error } = await supabase
    .from(CACHE_TABLE)
    .upsert(
      {
        barcode: product.code,
        product_name: product.product_name ?? null,
        brands: product.brands ?? null,
        nutriments: product.nutriments ?? null,
        image_url: product.image_url ?? null,
        nutriscore_grade: product.nutriscore_grade ?? null,
        nova_group: product.nova_group ?? null,
        ecoscore_grade: product.ecoscore_grade ?? null,
        ingredients_text: product.ingredients_text ?? null,
        allergens_tags: product.allergens_tags ?? null,
        serving_size: product.serving_size ?? null,
        completeness: product.completeness ?? null,
        cached_at: now.toISOString(),
        revalidated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_hit_at: now.toISOString(),
      },
      { onConflict: 'barcode' },
    );

  if (error) {
    safeLog.warn('nutrition.barcode.cache.write_error', 'cache write failed', {
      request_id: requestId,
      barcode: product.code,
      error: error.message,
    });
  }
}
