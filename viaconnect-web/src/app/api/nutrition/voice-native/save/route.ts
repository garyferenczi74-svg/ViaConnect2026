/**
 * Prompt 170n Phase B: Voice-Native meal save endpoint.
 *
 * Commits parsed meal_items as a meals row + meal_items rows. Uses the new
 * 'voice_native' meal_source enum value (added in Phase A migration).
 *
 * Privacy posture: voice_transcript persists ONLY when both:
 *  1. The user opted in via Settings transcript retention toggle
 *  2. The kill switch VOICE_NATIVE_TRANSCRIPT_RETENTION_ENABLED is true
 * Otherwise voice_transcript stays NULL and voice_transcript_retained=false.
 *
 * Audio is always ephemeral regardless of these settings (never persisted).
 *
 * 20pct sampled telemetry to voice_native_sessions (metadata only; NEVER
 * raw transcript or audio). Triggers BOS recompute via bos-bridge.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import {
  VOICE_NATIVE_PARSER_VERSION,
  STT_PROVIDERS,
  type SttProvider,
} from '@/lib/nutrition/voice-native/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SaveMealItemSchema = z.object({
  food_name: z.string().min(1).max(160),
  portion_grams: z.number().min(1).max(5000),
  cooking_method: z.string().max(40).nullable().optional(),
  source_transcript_span: z.string().max(500).optional(),
  caffeine_mg: z.number().min(0).max(1000).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  stt_confidence_for_span: z.number().min(0).max(1).optional(),
  combined_voice_confidence: z.number().min(0).max(1).optional(),
  modifiers: z.array(z.string().max(40)).max(20).optional(),
});

const RequestSchema = z.object({
  transcript: z.string().min(1).max(2000),
  transcript_locale: z.string().max(20).default('en-US'),
  transcript_retention_opted_in: z.boolean().default(false),
  stt_provider: z.enum(STT_PROVIDERS),
  stt_confidence_avg: z.number().min(0).max(1),
  audio_duration_ms: z.number().int().min(0).max(120_000).optional(),
  meal_items: z.array(SaveMealItemSchema).min(1).max(50),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  captured_at: z.string().datetime().optional(),
  parser_confidence_avg: z.number().min(0).max(1).optional(),
  combined_confidence_avg: z.number().min(0).max(1).optional(),
  clarification_rounds: z.number().int().min(0).max(3).default(0),
  fillers_removed_count: z.number().int().min(0).max(50).default(0),
  restarts_resolved_count: z.number().int().min(0).max(5).default(0),
  triggered_split: z.boolean().default(false),
  used_quick_apply: z.boolean().default(false),
});

function audioBucketFor(durationMs: number | undefined): string | null {
  if (typeof durationMs !== 'number') return null;
  if (durationMs < 3_000) return 'under_3s';
  if (durationMs < 10_000) return '3_to_10s';
  if (durationMs < 30_000) return '10_to_30s';
  if (durationMs < 60_000) return '30_to_60s';
  return 'over_60s';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.VOICE_NATIVE_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Voice entry is temporarily unavailable.' },
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
    transcript,
    transcript_locale,
    transcript_retention_opted_in,
    stt_provider,
    stt_confidence_avg,
    audio_duration_ms,
    meal_items,
    meal_type,
    captured_at,
    parser_confidence_avg,
    combined_confidence_avg,
    clarification_rounds,
    fillers_removed_count,
    restarts_resolved_count,
    triggered_split,
    used_quick_apply,
  } = parsed.data;

  const loggedAtIso = captured_at ?? new Date().toISOString();
  const totalCaffeineMg = meal_items.reduce(
    (acc, it) => acc + (typeof it.caffeine_mg === 'number' ? it.caffeine_mg : 0),
    0,
  );

  // Privacy gate: persist transcript only when user opted in AND kill switch on.
  const retentionEnabledServerSide = process.env.VOICE_NATIVE_TRANSCRIPT_RETENTION_ENABLED === 'true';
  const transcriptShouldPersist = transcript_retention_opted_in && retentionEnabledServerSide;

  const admin = createAdminClient();

  const { data: mealRow, error: mealErr } = await admin
    .from('meals')
    .insert({
      user_id: user.id,
      source: 'voice_native',
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
      voice_transcript: transcriptShouldPersist ? transcript : null,
      voice_transcript_locale: transcriptShouldPersist ? transcript_locale : null,
      voice_transcript_retained: transcriptShouldPersist,
      voice_native_parser_version: VOICE_NATIVE_PARSER_VERSION,
      voice_stt_provider_used: stt_provider,
      total_caffeine_mg: totalCaffeineMg > 0 ? totalCaffeineMg : null,
    })
    .select('meal_id')
    .single();

  if (mealErr || !mealRow) {
    safeLog.error('api.voice_native.save', 'meal insert failed', {
      error: mealErr,
      userId: user.id,
    });
    return NextResponse.json({ error: 'Could not save meal' }, { status: 500 });
  }

  const mealId = mealRow.meal_id;

  // source_transcript_span persists only when transcript retention persists.
  // Confidence numerics are always safe to persist (they don't reveal transcript content).
  const itemRows = meal_items.map((it, position) => ({
    meal_id: mealId,
    user_id: user.id,
    position,
    food_name: it.food_name,
    source: 'voice_native',
    nutrient_source: 'user_entered',
    portion_grams: it.portion_grams,
    parsed_portion_grams: it.portion_grams,
    cooking_method: it.cooking_method ?? null,
    source_transcript_span: transcriptShouldPersist ? (it.source_transcript_span ?? null) : null,
    stt_confidence_for_span: it.stt_confidence_for_span ?? null,
    combined_voice_confidence: it.combined_voice_confidence ?? null,
    entry_modality_hint: 'voice_native',
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
    safeLog.warn('api.voice_native.save', 'meal_items insert failed (meal already created)', {
      error: itemErr,
      userId: user.id,
      mealId,
    });
  }

  // 20pct sampled telemetry. Transcript text never stored; bucket + counts only.
  if (Math.random() < 0.2) {
    try {
      const userHash = hashUserId(user.id);
      await admin.from('voice_native_sessions').insert({
        user_hash: userHash,
        meal_id: mealId,
        stt_provider: stt_provider as SttProvider,
        stt_latency_ms: null,
        stt_confidence_avg,
        audio_duration_ms: audio_duration_ms ?? null,
        audio_duration_bucket: audioBucketFor(audio_duration_ms),
        nlu_provider: 'claude_haiku_4_5',
        parser_version: VOICE_NATIVE_PARSER_VERSION,
        parsed_items_count: meal_items.length,
        parser_confidence_avg: parser_confidence_avg ?? null,
        combined_confidence_avg: combined_confidence_avg ?? null,
        needed_clarification: clarification_rounds > 0,
        clarification_rounds,
        triggered_multi_meal_split: triggered_split,
        fillers_removed_count,
        restarts_resolved_count,
        user_edited_after_parse: false,
        used_quick_apply_mode: used_quick_apply,
        transcript_retention_was_on: transcriptShouldPersist,
        session_outcome: 'saved',
      });
    } catch (telemetryErr) {
      safeLog.warn('api.voice_native.save', 'telemetry insert failed (non-fatal)', {
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
    safeLog.warn('api.voice_native.save', 'bos recompute failed', {
      error: bosErr,
      userId: user.id,
    });
  }

  safeLog.info('api.voice_native.save', 'meal saved', {
    userId: user.id,
    mealId,
    itemsCount: meal_items.length,
    totalCaffeineMg,
    transcriptPersisted: transcriptShouldPersist,
  });

  return NextResponse.json({
    meal_id: mealId,
    items_count: meal_items.length,
    total_caffeine_mg: totalCaffeineMg,
    transcript_retained: transcriptShouldPersist,
  });
}

function hashUserId(userId: string): string {
  // Lightweight hash for telemetry stratification. See 170m save route for
  // rationale on this vs the privacy-grade app.corpus_salt hash.
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h) ^ userId.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}
