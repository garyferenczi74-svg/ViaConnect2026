// Prompt #161 section 5: POST /api/nutrition/quick-log
// Writes a "quick calories" row to nutrition_logs with status='confirmed',
// macros=null (unknown, not zero), and triggers Helix Rewards + BOS recompute.

import { NextRequest, NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import { awardNutritionLogPoints } from '@/lib/nutrition/helix-bridge';
import { QuickLogPayloadSchema } from '@/lib/nutrition/quick-log-schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = QuickLogPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { calories, mealType, note, loggedAt } = parsed.data;
    const loggedAtIso = loggedAt ?? new Date().toISOString();
    const trimmedNote = note?.trim() || null;
    const nowIso = new Date().toISOString();

    const { data: inserted, error: insertErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        logged_at: loggedAtIso,
        meal_type: mealType,
        source: 'quick_calories',
        raw_input: trimmedNote,
        serving_description: trimmedNote ?? 'Quick log',
        calories,
        protein_g: null,
        carbs_g: null,
        total_fat_g: null,
        good_fat_g: null,
        healthy_fat_g: null,
        saturated_fat_g: null,
        sugar_g: null,
        fiber_g: null,
        confidence: null,
        ai_notes: null,
        ai_model: null,
        ai_latency_ms: null,
        status: 'confirmed',
        confirmed_at: nowIso,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      safeLog.error('api.nutrition.quick-log', 'insert failed', { error: insertErr, userId: user.id });
      return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    }

    try {
      await awardNutritionLogPoints({ userId: user.id, source: 'quick_calories' });
    } catch (rewardErr) {
      safeLog.warn('api.nutrition.quick-log', 'helix award failed', { error: rewardErr, userId: user.id });
    }

    try {
      await recomputeNutritionDimension({ userId: user.id, date: loggedAtIso });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.quick-log', 'bos recompute failed', { error: bosErr, userId: user.id });
    }

    const sodIso = new Date(loggedAtIso);
    sodIso.setUTCHours(0, 0, 0, 0);
    const eodIso = new Date(sodIso);
    eodIso.setUTCDate(eodIso.getUTCDate() + 1);

    const { data: dayRows } = await supabase
      .from('nutrition_logs')
      .select('calories')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('logged_at', sodIso.toISOString())
      .lt('logged_at', eodIso.toISOString());

    const newDailyTotal = (dayRows ?? []).reduce<number>(
      (sum, r) => sum + (typeof r.calories === 'number' ? r.calories : 0),
      0,
    );

    safeLog.info('api.nutrition.quick-log', 'success', {
      userId: user.id,
      logId: inserted.id,
      calories,
      mealType,
      hasNote: !!trimmedNote,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({ logId: inserted.id, newDailyTotal });
  } catch (err) {
    safeLog.error('api.nutrition.quick-log', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
