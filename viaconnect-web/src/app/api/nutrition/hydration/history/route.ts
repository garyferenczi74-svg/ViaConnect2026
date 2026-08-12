/**
 * Prompt 170o Phase 1 Phase B: hydration history endpoint.
 *
 * Powers the weekly bar chart + monthly calendar heatmap on the Detail view.
 * Reads from the hydration_aggregations_daily materialized view.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { personalizeHydrationTarget } from '@/lib/nutrition/hydration/target-personalizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  range: z.enum(['week', 'month']).default('week'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Prompt 177m (2026-06-09): 170o launch gate removed (see quick-log).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    range: url.searchParams.get('range') ?? undefined,
    end_date: url.searchParams.get('end_date') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { range } = parsed.data;
  const endDate = parsed.data.end_date ?? new Date().toISOString().slice(0, 10);
  const windowDays = range === 'week' ? 7 : 30;
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (windowDays - 1));
  const startDateStr = startDate.toISOString().slice(0, 10);

  const admin = createAdminClient();

  const { data: profileRow } = await admin
    .from('profiles')
    .select('body_weight_kg, hydration_target_ml_per_day_custom')
    .eq('id', user.id)
    .maybeSingle();

  const target = personalizeHydrationTarget({
    body_weight_kg: profileRow?.body_weight_kg ?? null,
    custom_target_ml_per_day: profileRow?.hydration_target_ml_per_day_custom ?? null,
  });

  const { data: aggRows, error } = await admin
    .from('hydration_aggregations_daily')
    .select('day_utc, total_hydration_ml_adjusted, pure_water_ml, beverage_count, quick_log_count')
    .eq('user_id', user.id)
    .gte('day_utc', startDateStr)
    .lte('day_utc', endDate)
    .order('day_utc', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Could not load history data' }, { status: 500 });
  }

  type AggRow = {
    day_utc: string;
    total_hydration_ml_adjusted: number | null;
    pure_water_ml: number | null;
    beverage_count: number | null;
    quick_log_count: number | null;
  };
  const rows = (aggRows ?? []) as AggRow[];

  const days = rows.map((r) => {
    const totalMl = Number(r.total_hydration_ml_adjusted ?? 0);
    return {
      day_utc: r.day_utc,
      total_ml: Math.round(totalMl * 100) / 100,
      pure_water_ml: Math.round(Number(r.pure_water_ml ?? 0) * 100) / 100,
      target_ml: target,
      percentage_of_target: target > 0 ? Math.round((totalMl / target) * 1000) / 10 : 0,
      beverage_count: Number(r.beverage_count ?? 0),
      quick_log_count: Number(r.quick_log_count ?? 0),
    };
  });

  const totals = days.reduce((acc, d) => ({
    sum: acc.sum + d.total_ml,
    daysAtTarget: acc.daysAtTarget + (d.total_ml >= target ? 1 : 0),
    bestDay: d.total_ml > acc.bestDay.total_ml ? { day_utc: d.day_utc, total_ml: d.total_ml } : acc.bestDay,
  }), { sum: 0, daysAtTarget: 0, bestDay: { day_utc: endDate, total_ml: 0 } });

  const averageTotalMl = days.length > 0 ? Math.round((totals.sum / days.length) * 100) / 100 : 0;
  const averagePercentage = target > 0 ? Math.round((averageTotalMl / target) * 1000) / 10 : 0;

  return NextResponse.json({
    range,
    days,
    average_total_ml: averageTotalMl,
    average_percentage: averagePercentage,
    days_at_target_count: totals.daysAtTarget,
    streak_days: 0,
    best_day: totals.bestDay,
  });
}
