// Prompt #164: text meal analysis using Gemini 2.5 Flash + USDA FoodData
// Central. Layer 1, Layer 2, Layer 3, insert. One audit row per outcome.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { MealTypeSchema } from '@/lib/nutrition/schema';
import { parseDescriptionWithGemini, estimateItemWithGemini } from '@/lib/nutrition/gemini-client';
import { lookupFood } from '@/lib/nutrition/usda-client';
import { aggregate, type AggregatedItem } from '@/lib/nutrition/aggregate';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { recordAudit, newRequestId } from '@/lib/observability/audit-recorder';
import { GEMINI_MODEL } from '@/lib/nutrition/gemini-prompts';
import { estimateCostUsd } from '@/lib/observability/ai-pricing';
// Prompt 173b (Gary 2026-06-01) lifted the 168c/168d unscored lock on this
// path. Meals saved here now run through Gordon scoring + BOS recompute, so
// Today's Meals + Daily Macros + Dashboard Nutrition gauge all surface the
// score. The Today's Meals "Score not available for legacy meal" treatment
// now keys off quality_score IS NULL (the actual legacy marker, applied to
// pre-173b rows) rather than source='full_manual', so pre-existing legacy
// rows are unchanged while new full_manual saves contribute their score.
// The dual-write to nutrition_logs from #168 Apply C is preserved for
// realtime UNION read dedupe; the legacy_nutrition_log_id link still
// persists.
import { SOURCE_CONFIDENCE_DEFAULTS } from '@/lib/gordon/constants';
import { scoreMealForServerInsert } from '@/lib/gordon/scoreMealForServerInsert';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';

const ROUTE = '/api/nutrition/analyze-text';
const MIN_LEN = 5;
const MAX_LEN = 2000;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AIRouteError('UNAUTHENTICATED', 'no session', 401, 'Please sign in to log meals.');
    userId = user.id;

    const body = await req.json().catch(() => null);
    if (!body || typeof body.description !== 'string') {
      throw new AIRouteError('INVALID_INPUT', 'invalid body', 400, 'Please describe what you ate.');
    }
    const description: string = body.description.trim();
    if (description.length < MIN_LEN || description.length > MAX_LEN) {
      throw new AIRouteError('INVALID_INPUT', 'len out of range', 400, `Description must be ${MIN_LEN}-${MAX_LEN} characters.`);
    }
    const mealTypeP = MealTypeSchema.safeParse(body.mealType);
    if (!mealTypeP.success) throw new AIRouteError('INVALID_INPUT', 'mealType', 400, 'Pick a meal type.');
    const mealType = mealTypeP.data;
    const loggedAt = typeof body.loggedAt === 'string' && !Number.isNaN(Date.parse(body.loggedAt))
      ? body.loggedAt : new Date().toISOString();

    const { parsed, usage } = await parseDescriptionWithGemini(description);
    if (parsed.items.length === 0) {
      throw new AIRouteError('MALFORMED_RESPONSE', 'no items parsed', 502, 'We could not identify foods. Try being more specific or enter manually.');
    }

    const items: AggregatedItem[] = [];
    for (const item of parsed.items) {
      const usda = await lookupFood(item.name, item.quantity, item.unit).catch((e) => {
        safeLog.warn('api.nutrition.analyze-text', 'usda lookup failed', { error: e, name: item.name });
        return null;
      });
      if (usda) {
        items.push({ parsed: item, nutrients: usda });
      } else {
        const est = await estimateItemWithGemini(item.name, item.quantity, item.unit);
        items.push({
          parsed: item,
          nutrients: {
            calories: est.nutrients.calories, protein_g: est.nutrients.protein_g,
            carbs_g: est.nutrients.carbs_g, total_fat_g: est.nutrients.total_fat_g,
            saturated_fat_g: est.nutrients.saturated_fat_g, trans_fat_g: est.nutrients.trans_fat_g,
            omega3_g: est.nutrients.omega3_g, sugar_g: est.nutrients.sugar_g,
            fiber_g: est.nutrients.fiber_g, source: 'gemini_fallback',
          },
        });
      }
    }

    const analysis = aggregate(items);
    const latencyMs = Date.now() - startedAt;

    // Prompt 168 Apply C dual-write (preserved) + Prompt 173b (2026-06-01)
    // Gordon scoring. The 168c/168d unscored lock is lifted; quality_score
    // carries the Gordon-computed value so Today's Meals + Daily Macros +
    // Dashboard gauge all surface the score for new full_manual rows.
    // Pre-173b NULL-score rows remain the legacy marker.
    //
    // Prompt 173c: meals INSERT runs first (status quo); scoring runs after
    // and UPDATEs the row with the score. Decouples a scoring failure from
    // the meal save so the user never loses a meal because Gordon timed out.
    // console.error on scoring failure surfaces the actual stack in Vercel
    // runtime logs (safeLog.warn was getting swallowed in production).
    let mealId: string | null = null;
    try {
      const mealsInsert = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('meals' as any)
        .insert({
          user_id: user.id,
          logged_at: loggedAt,
          meal_type: mealType,
          source: 'full_manual',
          source_confidence: SOURCE_CONFIDENCE_DEFAULTS.full_manual,
          protein_g: analysis.protein_g,
          carbs_g: analysis.carbs_g,
          fat_total_g: analysis.total_fat_g,
          fat_healthy_g: analysis.healthy_fat_g,
          fiber_g: analysis.fiber_g,
          sugar_g: analysis.sugar_g,
          sodium_mg: 0,
          calories_kcal: analysis.calories,
          calories_auto_calc: false,
          meal_name: analysis.serving_description ?? null,
          notes: analysis.ai_notes ?? null,
          raw_input: { description, ai_model: GEMINI_MODEL, route: ROUTE },
          quality_score: null,
          quality_tier: null,
          score_breakdown: null,
          scored_at: null,
          gordon_version: null,
        })
        .select('meal_id')
        .single();
      if (mealsInsert.error || !mealsInsert.data) {
        safeLog.warn('api.nutrition.analyze-text', 'meals insert failed (continuing to legacy)', {
          error: mealsInsert.error?.message,
        });
      } else {
        const mid = (mealsInsert.data as { meal_id?: string }).meal_id;
        mealId = typeof mid === 'string' ? mid : null;
      }
    } catch (e) {
      safeLog.warn('api.nutrition.analyze-text', 'meals insert threw (continuing to legacy)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Prompt 173c: score the meal AFTER the row exists, then UPDATE in place.
    // Wrapped tightly so scoring failures never affect the meal save path.
    // scoredForLegacyLog is captured at this scope so the Prompt 173e legacy
    // meal_logs dual-write below can stamp meal_score with the same value.
    let scoredForLegacyLog: Awaited<ReturnType<typeof scoreMealForServerInsert>> | null = null;
    if (mealId !== null) {
      try {
        const scored = await scoreMealForServerInsert(supabase, {
          userId: user.id,
          loggedAt,
          mealType,
          source: 'full_manual',
          sourceConfidence: SOURCE_CONFIDENCE_DEFAULTS.full_manual,
          proteinG: analysis.protein_g,
          carbsG: analysis.carbs_g,
          fatTotalG: analysis.total_fat_g,
          fatHealthyG: analysis.healthy_fat_g,
          fiberG: analysis.fiber_g,
          sugarG: analysis.sugar_g,
          sodiumMg: 0,
          caloriesKcal: analysis.calories,
          caloriesAutoCalc: false,
          wholeFoodFlag: false,
          mealName: analysis.serving_description ?? null,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateRes = await (supabase as any).from('meals').update({
          quality_score: scored.quality_score,
          quality_tier: scored.quality_tier,
          score_breakdown: scored.score_breakdown,
          scored_at: scored.scored_at,
          gordon_version: scored.gordon_version,
        }).eq('meal_id', mealId);
        if (updateRes.error) {
          // eslint-disable-next-line no-console
          console.error('[analyze-text] meals score UPDATE failed', {
            mealId,
            error: updateRes.error.message,
            details: updateRes.error.details,
            hint: updateRes.error.hint,
            code: updateRes.error.code,
          });
        } else {
          scoredForLegacyLog = scored;
        }
      } catch (scoreErr) {
        // eslint-disable-next-line no-console
        console.error('[analyze-text] gordon score threw', {
          mealId,
          message: scoreErr instanceof Error ? scoreErr.message : String(scoreErr),
          stack: scoreErr instanceof Error ? scoreErr.stack : null,
          raw: JSON.stringify(scoreErr, Object.getOwnPropertyNames(scoreErr instanceof Error ? scoreErr : {})),
        });
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id, logged_at: loggedAt, meal_type: mealType,
        source: 'manual_text', raw_input: description,
        serving_description: analysis.serving_description,
        calories: analysis.calories, protein_g: analysis.protein_g, carbs_g: analysis.carbs_g,
        total_fat_g: analysis.total_fat_g, good_fat_g: analysis.good_fat_g,
        healthy_fat_g: analysis.healthy_fat_g, saturated_fat_g: analysis.saturated_fat_g,
        sugar_g: analysis.sugar_g, fiber_g: analysis.fiber_g,
        confidence: analysis.confidence, ai_notes: analysis.ai_notes,
        ai_model: GEMINI_MODEL, ai_latency_ms: latencyMs,
        data_source: analysis.data_source, status: 'pending_review',
      })
      .select('id')
      .single();

    if (insErr || !inserted) {
      // Prompt 168 Apply C: rollback orphan meals row if legacy insert failed
      // after the meals insert succeeded. Best effort; log + continue if delete
      // also fails so the user still sees the original AIRouteError.
      if (mealId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('meals' as any).delete().eq('meal_id', mealId);
        } catch (delErr) {
          safeLog.warn('api.nutrition.analyze-text', 'orphan meals delete failed', {
            mealId, error: delErr instanceof Error ? delErr.message : String(delErr),
          });
        }
      }
      throw new AIRouteError('UNKNOWN', `insert failed: ${insErr?.message}`, 500, 'Could not save draft. Try again.');
    }

    // Prompt 168 Apply C: link meals row back to legacy id for dashboard UNION dedupe.
    if (mealId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('meals' as any)
          .update({ legacy_nutrition_log_id: inserted.id })
          .eq('meal_id', mealId);
      } catch (linkErr) {
        safeLog.warn('api.nutrition.analyze-text', 'legacy link update failed', {
          mealId, legacyId: inserted.id,
          error: linkErr instanceof Error ? linkErr.message : String(linkErr),
        });
      }
    }

    // Prompt 173b: BOS recompute so the Dashboard Nutrition gauge picks up
    // the new scored full_manual meal. Best-effort; never fails the response.
    try {
      await recomputeNutritionDimension({ userId: user.id, date: loggedAt });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.analyze-text', 'bos recompute failed', {
        userId: user.id,
        error: bosErr instanceof Error ? bosErr.message : String(bosErr),
      });
    }

    // Prompt 173e (Gary 2026-06-01): legacy meal_logs dual-write so the
    // Dashboard Daily Scores Panel Nutrition gauge picks up the analyze-text
    // save alongside NutriVision (Hotfix 7 #170 Phase 1q established the
    // pattern). meal_logs.meal_score is the per-meal value the panel
    // averages for the today gauge. Wrapped best-effort; never fails the
    // response.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: legacyLogErr } = await (supabase as any)
        .from('meal_logs')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          log_method: 'manual',
          description: description.slice(0, 500),
          calories: Math.round(analysis.calories),
          protein_g: analysis.protein_g,
          carbs_g: analysis.carbs_g,
          fat_g: analysis.total_fat_g,
          source_app: 'log_a_full_meal',
          logged_at: loggedAt,
          meal_date: loggedAt.slice(0, 10),
          meal_score: scoredForLegacyLog?.quality_score ?? null,
        });
      if (legacyLogErr) {
        safeLog.warn('api.nutrition.analyze-text', 'legacy meal_logs insert failed (continuing)', {
          mealId,
          error: legacyLogErr.message ?? String(legacyLogErr),
        });
      }
    } catch (legacyLogThrew) {
      safeLog.warn('api.nutrition.analyze-text', 'legacy meal_logs insert threw (continuing)', {
        mealId,
        error: legacyLogThrew instanceof Error ? legacyLogThrew.message : String(legacyLogThrew),
      });
    }

    await recordAudit({
      requestId, userId: user.id, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'success', httpStatus: 200,
      inputChars: description.length, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      latencyMs, costUsd: estimateCostUsd(GEMINI_MODEL, usage.inputTokens, usage.outputTokens),
    });

    return NextResponse.json({ logId: inserted.id, analysis, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again or enter manually.', err);
    safeLog.warn('api.nutrition.analyze-text', 'failure', { code: ai.code, userId, message: ai.message });
    await recordAudit({
      requestId, userId, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'failure', errorCode: ai.code, httpStatus: ai.httpStatus,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: { code: ai.code, message: ai.userMessage, requestId } }, { status: ai.httpStatus });
  }
}
