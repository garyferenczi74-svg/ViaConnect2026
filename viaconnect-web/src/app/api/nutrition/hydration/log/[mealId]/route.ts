/**
 * Prompt 170o Phase 1.1: hydration log edit + delete endpoint.
 *
 * PUT updates meal_items.portion_volume_ml + hydration_source_kind, recomputes
 * hydration_ml based on user's current counting_mode. Also updates the parent
 * meals row's meal_name if the beverage_kind changed.
 *
 * DELETE removes the meal_items row. If the parent meal_kind='hydration_only'
 * and this was the only meal_item, deletes the meal too. Triggers BOS recompute
 * in both cases.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import { HYDRATION_SOURCE_KINDS, type HydrationSourceKind } from '@/lib/nutrition/hydration/types';
import { computeHydrationMl } from '@/lib/nutrition/hydration/hydration-ml-computer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  volume_ml: z.number().positive().min(10).max(2000).optional(),
  beverage_kind: z.enum(HYDRATION_SOURCE_KINDS).optional(),
});

const FOOD_NAME_BY_KIND: Record<string, string> = {
  pure_water: 'Water',
  coffee_tea: 'Coffee or tea',
  juice_smoothie: 'Juice',
  dairy: 'Milk',
  soda: 'Soda',
  alcohol_low: 'Beer',
  alcohol_high: 'Wine',
  sports_drink: 'Sports drink',
  high_water_food: 'High-water-content food',
};

interface RouteContext {
  params: { mealId: string };
}

async function loadOwnedMeal(adminClient: ReturnType<typeof createAdminClient>, mealId: string, userId: string) {
  const { data: meal } = await adminClient
    .from('meals')
    .select('meal_id, user_id, meal_kind, logged_at')
    .eq('meal_id', mealId)
    .maybeSingle();
  if (!meal || meal.user_id !== userId) return null;
  return meal;
}

export async function PUT(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  // Prompt 177m (2026-06-09): 170o launch gate removed (see quick-log).

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.volume_ml === undefined && parsed.data.beverage_kind === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const admin = createAdminClient();
  const meal = await loadOwnedMeal(admin, ctx.params.mealId, user.id);
  if (!meal) {
    return NextResponse.json({ error: 'Hydration log not found' }, { status: 404 });
  }

  const { data: profileRow } = await admin
    .from('profiles')
    .select('hydration_counting_mode')
    .eq('id', user.id)
    .maybeSingle();
  const countingMode = (profileRow?.hydration_counting_mode === 'adjusted' ? 'adjusted' : 'conservative') as 'conservative' | 'adjusted';

  const { data: itemRow } = await admin
    .from('meal_items')
    .select('id, hydration_source_kind, portion_volume_ml, food_name')
    .eq('meal_id', ctx.params.mealId)
    .not('hydration_source_kind', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!itemRow) {
    return NextResponse.json({ error: 'No hydration item on this meal' }, { status: 404 });
  }

  // Sweep 2026-06-12: narrow request and DB strings to HydrationSourceKind
  // via membership instead of a blind cast.
  const dbKind = itemRow.hydration_source_kind;
  const requestedKind = parsed.data.beverage_kind;
  const newKind: HydrationSourceKind =
    requestedKind && (HYDRATION_SOURCE_KINDS as readonly string[]).includes(requestedKind)
      ? (requestedKind as HydrationSourceKind)
      : dbKind !== null && (HYDRATION_SOURCE_KINDS as readonly string[]).includes(dbKind)
        ? (dbKind as HydrationSourceKind)
        : 'pure_water';
  const newVolume = parsed.data.volume_ml ?? Number(itemRow.portion_volume_ml ?? 0);
  const foodName = FOOD_NAME_BY_KIND[newKind] ?? itemRow.food_name;
  const newHydrationMl = computeHydrationMl({
    source_kind: newKind,
    portion_volume_ml: newVolume,
    counting_mode: countingMode,
    food_name: foodName,
  });

  const { error: itemErr } = await admin
    .from('meal_items')
    .update({
      portion_volume_ml: newVolume,
      portion_grams: newVolume,
      hydration_source_kind: newKind,
      hydration_ml: newHydrationMl,
      food_name: foodName,
      user_modified: true,
    })
    .eq('id', itemRow.id);

  if (itemErr) {
    safeLog.error('api.hydration.log.put', 'meal_item update failed', { error: itemErr, userId: user.id, mealId: ctx.params.mealId });
    return NextResponse.json({ error: 'Could not update hydration log' }, { status: 500 });
  }

  if (meal.meal_kind === 'hydration_only') {
    await admin
      .from('meals')
      .update({ meal_name: foodName })
      .eq('meal_id', ctx.params.mealId);
  }

  try {
    await recomputeNutritionDimension({ userId: user.id, date: meal.logged_at.slice(0, 10) });
  } catch (bosErr) {
    safeLog.warn('api.hydration.log.put', 'bos recompute failed', { error: bosErr });
  }

  return NextResponse.json({
    meal_id: ctx.params.mealId,
    hydration_ml: newHydrationMl,
    portion_volume_ml: newVolume,
    beverage_kind: newKind,
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  // Prompt 177m (2026-06-09): 170o launch gate removed (see quick-log).

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const meal = await loadOwnedMeal(admin, ctx.params.mealId, user.id);
  if (!meal) {
    return NextResponse.json({ error: 'Hydration log not found' }, { status: 404 });
  }

  if (meal.meal_kind === 'hydration_only') {
    const { error: mealErr } = await admin
      .from('meals')
      .delete()
      .eq('meal_id', ctx.params.mealId);
    if (mealErr) {
      safeLog.error('api.hydration.log.delete', 'meal delete failed', { error: mealErr, userId: user.id, mealId: ctx.params.mealId });
      return NextResponse.json({ error: 'Could not delete hydration log' }, { status: 500 });
    }
  } else {
    const { error: itemErr } = await admin
      .from('meal_items')
      .delete()
      .eq('meal_id', ctx.params.mealId)
      .not('hydration_source_kind', 'is', null);
    if (itemErr) {
      safeLog.error('api.hydration.log.delete', 'item delete failed', { error: itemErr, userId: user.id, mealId: ctx.params.mealId });
      return NextResponse.json({ error: 'Could not delete hydration entry' }, { status: 500 });
    }
  }

  try {
    await recomputeNutritionDimension({ userId: user.id, date: meal.logged_at.slice(0, 10) });
  } catch (bosErr) {
    safeLog.warn('api.hydration.log.delete', 'bos recompute failed', { error: bosErr });
  }

  return NextResponse.json({ deleted: true, meal_id: ctx.params.mealId });
}
