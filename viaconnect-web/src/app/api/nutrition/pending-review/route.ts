// Brief 3: persist a pending nutrition_logs row for the shared MealCard review.
// Photo, upload, voice, dictation, and text all land on /nutrition/log-meal/review.
// Does not insert meals. Discard must not leave a visible meal.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { computeMealKcal } from '@/lib/nutrition/compute-meal-kcal';
import { MealTypeSchema } from '@/lib/nutrition/schema';
import {
  isMealCardEntrySource,
  logSourceForEntry,
  encodePendingRawInput,
  contractFromAnalysis,
} from '@/lib/nutrition/meal-card-contract/toContract';
import type { NutritionAnalysis } from '@/lib/nutrition/schema';

export const dynamic = 'force-dynamic';

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  return null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const rec = body as Record<string, unknown>;
    if (!isMealCardEntrySource(rec.source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }
    const mealTypeP = MealTypeSchema.safeParse(rec.mealType);
    if (!mealTypeP.success) {
      return NextResponse.json({ error: 'Pick a meal type.' }, { status: 400 });
    }
    const serving = asString(rec.serving_description).trim().slice(0, 2000);
    if (serving.length === 0) {
      return NextResponse.json({ error: 'Serving description required' }, { status: 400 });
    }

    const protein = asFiniteNumber(rec.protein_g) ?? 0;
    const carbs = asFiniteNumber(rec.carbs_g) ?? 0;
    const fat = asFiniteNumber(rec.total_fat_g) ?? 0;
    const fiber = asFiniteNumber(rec.fiber_g) ?? 0;
    const sugar = asFiniteNumber(rec.sugar_g) ?? 0;
    const saturated = asFiniteNumber(rec.saturated_fat_g) ?? 0;
    const calories = computeMealKcal({
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      fiberG: fiber,
    });
    const confidence = asFiniteNumber(rec.confidence) ?? 0.5;
    const loggedAtRaw = rec.loggedAt;
    const loggedAt =
      typeof loggedAtRaw === 'string' && !Number.isNaN(Date.parse(loggedAtRaw))
        ? loggedAtRaw
        : new Date().toISOString();

    const microsIn = rec.micronutrients;
    const micronutrients: Record<string, number> = {};
    if (microsIn && typeof microsIn === 'object' && !Array.isArray(microsIn)) {
      for (const [key, value] of Object.entries(microsIn as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          micronutrients[key] = value;
        }
      }
    }
    const foodNames = Array.isArray(rec.food_names)
      ? rec.food_names.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      : [serving];

    const analysis: NutritionAnalysis = {
      calories,
      protein_g: protein,
      carbs_g: carbs,
      total_fat_g: fat,
      saturated_fat_g: saturated,
      sugar_g: sugar,
      fiber_g: fiber,
      confidence: Math.max(0, Math.min(1, confidence)),
      ai_notes: asString(rec.ai_notes).slice(0, 2000),
      serving_description: serving,
      data_source: rec.source === 'photo' || rec.source === 'upload' ? 'mixed' : 'gemini_fallback',
    };
    const contract = contractFromAnalysis(analysis, rec.source, {
      foodNames,
      micronutrients,
    });

    const { data: inserted, error: insErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        logged_at: loggedAt,
        meal_type: mealTypeP.data,
        source: logSourceForEntry(rec.source),
        raw_input: encodePendingRawInput(contract),
        serving_description: serving,
        calories,
        protein_g: protein,
        carbs_g: carbs,
        total_fat_g: fat,
        good_fat_g: null,
        healthy_fat_g: null,
        saturated_fat_g: saturated,
        sugar_g: sugar,
        fiber_g: fiber,
        confidence: analysis.confidence,
        ai_notes: analysis.ai_notes,
        status: 'pending_review',
      })
      .select('id')
      .single();

    if (insErr || !inserted) {
      safeLog.error('api.nutrition.pending-review', 'insert failed', {
        error: insErr?.message,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Could not save draft. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ logId: inserted.id });
  } catch (err) {
    safeLog.error('api.nutrition.pending-review', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
