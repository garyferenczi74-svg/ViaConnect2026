// Prompt #160 section 4.3: confirm a pending nutrition log.
// POST body: { logId, edits? }
// Auth: Supabase session required.
// Applies user edits, flips status to confirmed, triggers BOS recompute and
// Helix Rewards award.

import { NextRequest, NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import { awardNutritionLogPoints } from '@/lib/nutrition/helix-bridge';
import { resolveFatBreakdown, loadFatSourceById } from '@/lib/nutrition/fat-sources';
import { scoreMealForServerInsert } from '@/lib/gordon/scoreMealForServerInsert';

interface MaybeEdits {
  serving_description?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  total_fat_g?: number;
  saturated_fat_g?: number;
  sugar_g?: number;
  fiber_g?: number;
}

const NUMERIC_FIELDS = [
  'calories',
  'protein_g',
  'carbs_g',
  'total_fat_g',
  'saturated_fat_g',
  'sugar_g',
  'fiber_g',
] as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const logId: string | undefined = body?.logId;
    if (!logId || typeof logId !== 'string') {
      return NextResponse.json({ error: 'Invalid logId' }, { status: 400 });
    }

    const edits: MaybeEdits = body?.edits && typeof body.edits === 'object' ? body.edits : {};
    // Prompt 184b: optional fat source picked in review. undefined = not sent
    // (older clients); string = a source id; null = explicitly cleared.
    const fatSourceId: string | null | undefined =
      typeof body?.fatSourceId === 'string' || body?.fatSourceId === null ? body.fatSourceId : undefined;

    const update: Record<string, unknown> = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    };

    let userEdited = false;
    if (typeof edits.serving_description === 'string' && edits.serving_description.trim().length > 0) {
      update.serving_description = edits.serving_description.trim().slice(0, 2000);
      userEdited = true;
    }
    for (const field of NUMERIC_FIELDS) {
      const v = edits[field];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        update[field] = v;
        userEdited = true;
      }
    }
    if (userEdited) {
      update.user_edited = true;
      update.confidence = 1.0;
      update.data_source = 'manual';
    }

    const { data: row, error: selErr } = await supabase
      .from('nutrition_logs')
      .select('id, user_id, source, logged_at, status')
      .eq('id', logId)
      .single();

    if (selErr || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (row.status === 'confirmed') {
      return NextResponse.json({ ok: true, alreadyConfirmed: true });
    }
    if (row.status === 'discarded') {
      return NextResponse.json({ error: 'Cannot confirm a discarded draft' }, { status: 409 });
    }

    const { error: updErr } = await supabase
      .from('nutrition_logs')
      .update(update)
      .eq('id', logId)
      .eq('user_id', user.id);

    if (updErr) {
      safeLog.error('api.nutrition.confirm', 'update failed', { error: updErr, userId: user.id, logId });
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    // Prompt 184b: when the review picked a fat source, persist it on the
    // canonical meals row (linked via legacy_nutrition_log_id) and re-score so
    // the fat-quality fold is reflected. Best-effort; never fails the confirm.
    if (fatSourceId !== undefined) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: mealRow } = await (supabase as any)
          .from('meals')
          .select('meal_id, meal_type, source, source_confidence, protein_g, carbs_g, fat_total_g, fiber_g, sugar_g, sodium_mg, calories_kcal, calories_auto_calc, whole_food_flag, meal_name')
          .eq('legacy_nutrition_log_id', logId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (mealRow) {
          const source = fatSourceId ? await loadFatSourceById(supabase, fatSourceId) : null;
          const fatBreakdown = resolveFatBreakdown({
            intrinsicTotalFatG: Number(mealRow.fat_total_g ?? 0),
            intrinsicSaturatedG: typeof edits.saturated_fat_g === 'number' ? edits.saturated_fat_g : 0,
            addedFatG: 0,
            source,
          });
          const scored = await scoreMealForServerInsert(supabase, {
            userId: user.id,
            loggedAt: row.logged_at,
            mealType: mealRow.meal_type,
            source: mealRow.source,
            sourceConfidence: Number(mealRow.source_confidence ?? 0.65),
            proteinG: Number(mealRow.protein_g ?? 0),
            carbsG: Number(mealRow.carbs_g ?? 0),
            fatTotalG: Number(mealRow.fat_total_g ?? 0),
            fatSourceId,
            fatBreakdown,
            fiberG: Number(mealRow.fiber_g ?? 0),
            sugarG: Number(mealRow.sugar_g ?? 0),
            sodiumMg: Number(mealRow.sodium_mg ?? 0),
            caloriesKcal: Number(mealRow.calories_kcal ?? 0),
            caloriesAutoCalc: mealRow.calories_auto_calc === true,
            wholeFoodFlag: typeof mealRow.whole_food_flag === 'boolean' ? mealRow.whole_food_flag : null,
            mealName: mealRow.meal_name ?? null,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('meals')
            .update({
              fat_source_id: fatSourceId,
              fat_breakdown: fatBreakdown,
              fat_quality_contribution: scored.fat_quality_contribution,
              quality_score: scored.quality_score,
              quality_tier: scored.quality_tier,
              score_breakdown: scored.score_breakdown,
              scored_at: scored.scored_at,
              gordon_version: scored.gordon_version,
            })
            .eq('meal_id', mealRow.meal_id)
            .eq('user_id', user.id);
        }
      } catch (fsErr) {
        safeLog.warn('api.nutrition.confirm', 'fat source meals update failed', { error: fsErr, logId });
      }
    }

    try {
      await awardNutritionLogPoints({
        userId: user.id,
        source: row.source as 'manual_text' | 'photo_ai' | 'barcode' | 'imported',
      });
    } catch (rewardErr) {
      safeLog.warn('api.nutrition.confirm', 'helix award failed', { error: rewardErr, userId: user.id });
    }

    try {
      await recomputeNutritionDimension({ userId: user.id, date: row.logged_at });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.confirm', 'bos recompute failed', { error: bosErr, userId: user.id });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error('api.nutrition.confirm', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
