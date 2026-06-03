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
 * Phase B review revisions 2026-06-03: gated behind the
 * BEVERAGE_CATALOG_RENDERING_ENABLED kill switch (default true). Flip
 * to false for emergency rollback during a 170c section 9 incident; the
 * picker mount on /wellness-analytics/hydration silently unmounts and
 * this endpoint returns 503. Separate from HYDRATION_TRACKING_ENABLED
 * which gates the 170o write paths.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // Kill switch gate: emergency rollback path for the catalog read surface.
  // Mirrors the 503 posture the sibling 170o endpoints use when
  // HYDRATION_TRACKING_ENABLED is false; the picker treats this as a silent
  // unmount on the client per Phase 2 BOS line precedent.
  if (!isKillSwitchEnabled('BEVERAGE_CATALOG_RENDERING_ENABLED')) {
    return NextResponse.json({ error: 'beverage catalog disabled' }, { status: 503 });
  }

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
