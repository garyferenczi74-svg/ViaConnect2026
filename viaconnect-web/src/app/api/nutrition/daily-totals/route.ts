// Prompt #162 section 7: GET /api/nutrition/daily-totals
// Returns the day's aggregated totals for the five chart metrics + targets
// (protocol engine or fallback) + log_count + has_quick_only flag.

import { NextRequest, NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { computeFallbackTargets, type NutritionTargets } from '@/lib/nutrition/target-fallback';

export const dynamic = 'force-dynamic';

const MAX_BACKDATE_DAYS = 90;

interface ChartTotals {
  readonly calories: number;
  readonly carbs_g: number;
  readonly bad_fat_g: number;
  readonly good_fat_g: number;
  readonly sugar_g: number;
}

interface DailyTotalsResponse {
  readonly date: string;
  readonly totals: ChartTotals;
  readonly targets: NutritionTargets;
  readonly log_count: number;
  readonly has_quick_only: boolean;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(input: string | null): Date {
  if (!input) {
    const t = new Date();
    t.setUTCHours(0, 0, 0, 0);
    return t;
  }
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Invalid date format, expected YYYY-MM-DD');
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dayStart: Date;
    try {
      dayStart = parseDate(new URL(req.url).searchParams.get('date'));
    } catch {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (dayStart.getTime() > today.getTime()) {
      return NextResponse.json({ error: 'Future dates not allowed' }, { status: 400 });
    }
    const ageDays = (today.getTime() - dayStart.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > MAX_BACKDATE_DAYS) {
      return NextResponse.json({ error: 'Date is more than 90 days old' }, { status: 400 });
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const { data: rows, error: rowsErr } = await supabase
      .from('nutrition_logs')
      .select('source, calories, carbs_g, saturated_fat_g, good_fat_g, healthy_fat_g, sugar_g')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('logged_at', dayStart.toISOString())
      .lt('logged_at', dayEnd.toISOString());

    if (rowsErr) {
      safeLog.error('api.nutrition.daily-totals', 'select failed', { error: rowsErr, userId: user.id });
      return NextResponse.json({ error: 'Read failed' }, { status: 500 });
    }

    const list = rows ?? [];

    const totals: ChartTotals = list.reduce<ChartTotals>(
      (acc, r) => ({
        calories: acc.calories + (typeof r.calories === 'number' ? r.calories : 0),
        carbs_g: acc.carbs_g + (typeof r.carbs_g === 'number' ? Number(r.carbs_g) : 0),
        bad_fat_g: acc.bad_fat_g + (typeof r.saturated_fat_g === 'number' ? Number(r.saturated_fat_g) : 0),
        good_fat_g:
          acc.good_fat_g
          + (typeof r.good_fat_g === 'number' ? Number(r.good_fat_g) : 0)
          + (typeof r.healthy_fat_g === 'number' ? Number(r.healthy_fat_g) : 0),
        sugar_g: acc.sugar_g + (typeof r.sugar_g === 'number' ? Number(r.sugar_g) : 0),
      }),
      { calories: 0, carbs_g: 0, bad_fat_g: 0, good_fat_g: 0, sugar_g: 0 },
    );

    const log_count = list.length;
    const has_quick_only =
      log_count > 0 && list.every((r) => r.source === 'quick_calories');

    // TODO(#162 follow-up): when the protocol engine ships getNutritionTargets,
    // call it here and return source='protocol_engine'. Until then, the
    // fallback engages with adult-male defaults (tier=0, confidence=0.5).
    //
    // The existing user_health_profile table carries activity_level only,
    // not the full demographics the fallback needs (sex, age, weight_kg,
    // height_cm, goal), so we deliberately skip the DB profile read rather
    // than spam "relation does not exist" errors. The fallback's defaults
    // are honest about being estimates per the ProtocolTierChip copy.
    const targets = computeFallbackTargets({});

    const response: DailyTotalsResponse = {
      date: isoDate(dayStart),
      totals: {
        calories: Math.round(totals.calories),
        carbs_g: Math.round(totals.carbs_g * 10) / 10,
        bad_fat_g: Math.round(totals.bad_fat_g * 10) / 10,
        good_fat_g: Math.round(totals.good_fat_g * 10) / 10,
        sugar_g: Math.round(totals.sugar_g * 10) / 10,
      },
      targets,
      log_count,
      has_quick_only,
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    safeLog.error('api.nutrition.daily-totals', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
