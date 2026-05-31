/**
 * Prompt 170m Phase B: Quick Log meal save endpoint.
 *
 * Commits parsed meal_items as a meals row + meal_items rows. Reuses the
 * existing 'quick_log' meal_source enum value (no enum change required).
 * Stores the typed text_input on meals.text_input + parser_version stamp
 * + total_caffeine_mg roll-up. Fires BOS recompute via bos-bridge.
 *
 * 20% sampled telemetry to quick_log_sessions (metadata only; NEVER text).
 * Helix quick_log_meal_saved 4pt awarded by the analytics consumer of the
 * session row (or fire-and-forget here if the existing emit-helix helper
 * is wired into save endpoints, mirrors 170l/170j patterns).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import {
  QUICK_LOG_PARSER_VERSION,
  ALLERGEN_VOCAB,
} from '@/lib/nutrition/quick-log/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SaveMealItemSchema = z.object({
  food_name: z.string().min(1).max(160),
  portion_grams: z.number().min(1).max(5000),
  cooking_method: z.string().max(40).nullable().optional(),
  source_text_span: z.string().max(500).optional(),
  caffeine_mg: z.number().min(0).max(1000).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  modifiers: z.array(z.string().max(40)).max(20).optional(),
});

const RequestSchema = z.object({
  text_input: z.string().min(1).max(500),
  text_input_locale: z.string().max(20).default('en-US'),
  meal_items: z.array(SaveMealItemSchema).min(1).max(50),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  captured_at: z.string().datetime().optional(),
  dietary_restriction_flags: z.array(z.enum(ALLERGEN_VOCAB)).max(20).optional(),
  restaurant_context: z.object({
    chain_slug: z.string(),
    chain_name: z.string(),
  }).nullable().optional(),
  parser_confidence_avg: z.number().min(0).max(1).optional(),
  clarification_rounds: z.number().int().min(0).max(3).default(0),
  triggered_split: z.boolean().default(false),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.QUICK_LOG_TEXT_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Quick Log is temporarily unavailable.' },
      { status: 503 },
    );
  }

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

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    text_input,
    text_input_locale,
    meal_items,
    meal_type,
    captured_at,
    parser_confidence_avg,
    clarification_rounds,
    triggered_split,
  } = parsed.data;

  const loggedAtIso = captured_at ?? new Date().toISOString();
  const totalCaffeineMg = meal_items.reduce(
    (acc, it) => acc + (typeof it.caffeine_mg === 'number' ? it.caffeine_mg : 0),
    0,
  );

  const admin = createAdminClient();

  const { data: mealRow, error: mealErr } = await admin
    .from('meals')
    .insert({
      user_id: user.id,
      source: 'quick_log',
      meal_type,
      logged_at: loggedAtIso,
      source_confidence: parser_confidence_avg ?? 0.85,
      calories_kcal: 0,
      calories_auto_calc: true,
      protein_g: 0,
      carbs_g: 0,
      fat_total_g: 0,
      fat_healthy_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
      text_input,
      text_input_locale,
      quick_log_parser_version: QUICK_LOG_PARSER_VERSION,
      total_caffeine_mg: totalCaffeineMg > 0 ? totalCaffeineMg : null,
    })
    .select('meal_id')
    .single();

  if (mealErr || !mealRow) {
    safeLog.error('api.quick_log.save', 'meal insert failed', {
      error: mealErr,
      userId: user.id,
    });
    return NextResponse.json({ error: 'Could not save meal' }, { status: 500 });
  }

  const mealId = mealRow.meal_id;

  const itemRows = meal_items.map((it, position) => ({
    meal_id: mealId,
    user_id: user.id,
    position,
    food_name: it.food_name,
    source: 'quick_log',
    nutrient_source: 'user_entered',
    portion_grams: it.portion_grams,
    parsed_portion_grams: it.portion_grams,
    cooking_method: it.cooking_method ?? null,
    source_text_span: it.source_text_span ?? null,
    entry_modality_hint: 'quick_log_text',
    caffeine_mg: typeof it.caffeine_mg === 'number' && it.caffeine_mg > 0 ? it.caffeine_mg : null,
    recognition_confidence: it.confidence ?? null,
    user_modified: false,
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  }));

  const { error: itemErr } = await admin
    .from('meal_items')
    .insert(itemRows);

  if (itemErr) {
    safeLog.warn('api.quick_log.save', 'meal_items insert failed (meal already created)', {
      error: itemErr,
      userId: user.id,
      mealId,
    });
  }

  // 20% sampled telemetry. Text never stored; length only.
  if (Math.random() < 0.2) {
    try {
      const userHash = hashUserId(user.id);
      await admin.from('quick_log_sessions').insert({
        user_hash: userHash,
        meal_id: mealId,
        text_input_length: text_input.length,
        nlu_provider: 'claude_haiku_4_5',
        parser_version: QUICK_LOG_PARSER_VERSION,
        parsed_items_count: meal_items.length,
        parser_confidence_avg: parser_confidence_avg ?? null,
        needed_clarification: clarification_rounds > 0,
        clarification_rounds,
        triggered_multi_meal_split: triggered_split,
        triggered_caffeine_inference: totalCaffeineMg > 0,
        user_edited_after_parse: false,
        session_outcome: 'saved',
      });
    } catch (telemetryErr) {
      safeLog.warn('api.quick_log.save', 'telemetry insert failed (non-fatal)', {
        error: telemetryErr,
      });
    }
  }

  try {
    await recomputeNutritionDimension({
      userId: user.id,
      date: loggedAtIso.slice(0, 10),
    });
  } catch (bosErr) {
    safeLog.warn('api.quick_log.save', 'bos recompute failed', {
      error: bosErr,
      userId: user.id,
    });
  }

  safeLog.info('api.quick_log.save', 'meal saved', {
    userId: user.id,
    mealId,
    itemsCount: meal_items.length,
    totalCaffeineMg,
  });

  return NextResponse.json({
    meal_id: mealId,
    calories_kcal: 0,
    items_count: meal_items.length,
    total_caffeine_mg: totalCaffeineMg,
  });
}

function hashUserId(userId: string): string {
  // Lightweight hash for telemetry stratification. Not a privacy-grade hash;
  // app.corpus_salt-based hashing lives in lib/nutrition/corpus/user-hash.ts
  // for that purpose. This is "good enough for grouping similar users."
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h) ^ userId.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}
