/**
 * Prompt 172e Phase A Deliverable 5: GET /api/nutrition/hydration/catalog.
 *
 * Returns the active beverage_catalog rows ordered by category then
 * sort_order. The catalog is global consumer data so the response is
 * shaped for CDN cache reuse: public Cache-Control with a 1 hour max age.
 *
 * Authenticated only; mirrors the auth posture of the sibling hydration
 * endpoints (today, log, quick-log). Unauthenticated callers get 401.
 *
 * Phase B will mount this endpoint to the catalog driven picker UI on
 * /wellness-analytics/hydration; for Phase A there is no consumer
 * facing render, so no kill switch gate is added yet. A
 * BEVERAGE_CATALOG_RENDERING_ENABLED kill switch can be introduced in
 * Phase B without changing this endpoint's shape.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('beverage_catalog')
    .select(
      'id, slug, category, hydration_source_kind, display_name, default_volume_ml, hydration_coefficient, caffeine_mg_per_serving, kcal_per_serving, sugar_g, sodium_mg, potassium_mg, magnesium_mg, is_alcoholic, abv, evidence_source, requires_claim_review, is_active, sort_order',
    )
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    safeLog.warn('api.hydration.catalog', 'catalog fetch failed', { error, userId: user.id });
    return NextResponse.json({ error: 'Could not load beverage catalog' }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
