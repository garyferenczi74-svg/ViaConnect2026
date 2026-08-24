/**
 * Prompt 172e Phase D Workstream 1: GET /api/nutrition/hydration/breakdown.
 *
 * Returns the today aggregated beverage breakdown for the authenticated
 * user. Reads meal_items joined to meals filtered to the user's local UTC
 * day, joined to beverage_catalog via beverage_catalog_slug for the
 * category + coefficient. Falls back to the source kind mapping for
 * legacy 170o quick log rows without a slug.
 *
 * Aggregation runs server side via the same pure aggregateBreakdown
 * helper the client tests exercise so the legend numbers always reconcile
 * with the chart.
 *
 * Cache-Control: private max age 300 (5 min). Short enough that a quick
 * log refresh sees fresh data within a tap; long enough to absorb
 * dashboard mounts during a single session without re hitting the DB.
 *
 * Kill switch: gated behind BEVERAGE_CATALOG_RENDERING_ENABLED. Mirrors
 * the catalog endpoint posture; a 170c section 9 emergency rollback
 * flip disables the breakdown surface alongside the catalog read.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import {
  aggregateBreakdown,
  type BreakdownCatalogRow,
  type BreakdownEvent,
} from '@/components/nutrition/hydration/BeverageBreakdown/breakdown-aggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // Kill switch short circuit: identical posture to the catalog endpoint
  // so a single env flip disables both the picker and the breakdown
  // during a 170c section 9 incident. The client treats this as a
  // silent unmount per Phase B precedent.
  if (!isKillSwitchEnabled('BEVERAGE_CATALOG_RENDERING_ENABLED')) {
    return NextResponse.json({ error: 'beverage catalog disabled' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  // Read today's hydration events. Filtered to rows with a non null
  // hydration_source_kind so non hydration meal_items do not leak into
  // the breakdown.
  const { data: eventRows, error: eventsErr } = await admin
    .from('meal_items')
    .select('meal_id, hydration_source_kind, beverage_catalog_slug, portion_volume_ml, meals!inner(user_id, logged_at)')
    .eq('meals.user_id', user.id)
    .gte('meals.logged_at', todayStartIso)
    .not('hydration_source_kind', 'is', null);

  if (eventsErr) {
    safeLog.warn('api.hydration.breakdown', 'events fetch failed', { error: eventsErr, userId: user.id });
    return NextResponse.json({ error: 'Could not load breakdown' }, { status: 500 });
  }

  // Read the active catalog for the slug + kind join. Same query the
  // catalog endpoint uses; we cannot share the response because the route
  // here needs an in process row set, not a JSON body.
  const { data: catalogRows, error: catalogErr } = await admin
    .from('beverage_catalog')
    .select('slug, category, hydration_source_kind, hydration_coefficient')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (catalogErr) {
    safeLog.warn('api.hydration.breakdown', 'catalog fetch failed', { error: catalogErr, userId: user.id });
    return NextResponse.json({ error: 'Could not load breakdown' }, { status: 500 });
  }

  type EventRow = {
    meal_id: string;
    hydration_source_kind: string | null;
    beverage_catalog_slug: string | null;
    portion_volume_ml: number | null;
  };

  const events: BreakdownEvent[] = ((eventRows ?? []) as EventRow[]).map((row) => ({
    meal_id: row.meal_id,
    beverage_kind: row.hydration_source_kind ?? '',
    beverage_catalog_slug: row.beverage_catalog_slug ?? null,
    volume_ml: Number(row.portion_volume_ml ?? 0),
  }));

  const catalog = (catalogRows ?? []) as BreakdownCatalogRow[];
  const breakdown = aggregateBreakdown(events, catalog);

  return NextResponse.json(breakdown, {
    headers: {
      'Cache-Control': 'private, max-age=300',
    },
  });
}
