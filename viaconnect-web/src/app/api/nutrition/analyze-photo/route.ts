// Prompt #164: photo meal analysis using Gemini 2.5 Flash Vision + USDA.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { MealTypeSchema } from '@/lib/nutrition/schema';
import { parseImageWithGemini, estimateItemWithGemini } from '@/lib/nutrition/gemini-client';
import { lookupFood } from '@/lib/nutrition/usda-client';
import { aggregate, type AggregatedItem } from '@/lib/nutrition/aggregate';
import { resolveFatBreakdown } from '@/lib/nutrition/fat-sources';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { recordAudit, newRequestId } from '@/lib/observability/audit-recorder';
import { GEMINI_MODEL } from '@/lib/nutrition/gemini-prompts';
import { estimateCostUsd } from '@/lib/observability/ai-pricing';
// Prompt 168 Apply C: Path A dual-write to canonical meals table.
// Per Gary 2026-05-15: persist Gordon score on the meals row at insert time
// so this channel matches the Quick Log channel's scoring behavior.
import { scoreMealForServerInsert } from '@/lib/gordon/scoreMealForServerInsert';
import { awardNutritionLogPoints } from '@/lib/nutrition/helix-bridge';

const ROUTE = '/api/nutrition/analyze-photo';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AIRouteError('UNAUTHENTICATED', 'no session', 401, 'Please sign in to log meals.');
    userId = user.id;

    const form = await req.formData().catch(() => null);
    if (!form) throw new AIRouteError('INVALID_INPUT', 'no form', 400, 'Please upload a photo.');
    const image = form.get('image');
    if (!(image instanceof File)) throw new AIRouteError('INVALID_INPUT', 'no image', 400, 'Please upload a photo.');
    if (image.size > MAX_FILE_BYTES) throw new AIRouteError('INVALID_INPUT', 'too large', 400, 'Image too large (max 10 MB).');
    const mime = image.type.toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      if (mime === 'image/heic' || mime === 'image/heif') {
        throw new AIRouteError('INVALID_INPUT', 'heic', 400, 'HEIC not supported yet. Please use JPG or PNG.');
      }
      throw new AIRouteError('INVALID_INPUT', 'mime', 400, 'Unsupported image type.');
    }
    const mealTypeP = MealTypeSchema.safeParse(form.get('mealType'));
    if (!mealTypeP.success) throw new AIRouteError('INVALID_INPUT', 'mealType', 400, 'Pick a meal type.');
    const mealType = mealTypeP.data;
    const loggedAtRaw = form.get('loggedAt');
    const loggedAt = typeof loggedAtRaw === 'string' && !Number.isNaN(Date.parse(loggedAtRaw))
      ? loggedAtRaw : new Date().toISOString();
    const noteRaw = form.get('note');
    const note = typeof noteRaw === 'string' ? noteRaw.slice(0, 500).trim() : '';

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const ym = new Date().toISOString().slice(0, 7);
    const fileId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${user.id}/${ym}/${fileId}.${ext}`;
    const buf = Buffer.from(await image.arrayBuffer());
    const uploadResult = await supabase.storage.from('nutrition-photos').upload(storagePath, buf, { contentType: mime, upsert: false });
    if (uploadResult.error) throw new AIRouteError('API_DOWN', `upload: ${uploadResult.error.message}`, 503, 'Could not upload photo. Check your connection.');

    const { parsed, usage } = await parseImageWithGemini(buf, mime, note);
    if (parsed.items.length === 0) {
      throw new AIRouteError('MALFORMED_RESPONSE', 'no items', 502, 'We could not identify foods in this photo. Try a clearer shot or enter manually.');
    }

    const items: AggregatedItem[] = [];
    for (const item of parsed.items) {
      const usda = await lookupFood(item.name, item.quantity, item.unit, undefined, item.preparation).catch((e) => {
        safeLog.warn('api.nutrition.analyze-photo', 'usda lookup failed', { error: e, name: item.name });
        return null;
      });
      let nutrients: AggregatedItem['nutrients'] | null = usda;
      // Prompt 186 Phase 3: re-estimate any single item beyond the
      // plausibility bounds (900 kcal / 60 g fat per parsed portion) before
      // display. Fail open: keep the flagged value if re-estimation fails;
      // aggregate() downgrades meal confidence either way.
      if (usda?.meta?.plausibilityFlagged === true) {
        safeLog.warn('api.nutrition.analyze-photo', 'plausibility bound exceeded; re-estimating item', {
          name: item.name, matched: usda.meta.matchedName,
          calories: usda.calories, total_fat_g: usda.total_fat_g,
        });
        const reEst = await estimateItemWithGemini(item.name, item.quantity, item.unit).catch(() => null);
        if (reEst) nutrients = { ...reEst.nutrients, source: 'gemini_fallback' };
      }
      if (!nutrients) {
        // Prompt 186 incident fix: an estimator failure for ONE item no
        // longer fails the whole meal; the item degrades to UNKNOWN
        // nutrients (null, never 0) and the meal saves.
        try {
          const est = await estimateItemWithGemini(item.name, item.quantity, item.unit);
          nutrients = { ...est.nutrients, source: 'gemini_fallback' };
        } catch (estErr) {
          safeLog.warn('api.nutrition.analyze-photo', 'estimator failed; item degrades to unknown', {
            name: item.name,
            error: estErr instanceof Error ? estErr.message : String(estErr),
          });
          nutrients = {
            calories: null, protein_g: null, carbs_g: null, total_fat_g: null,
            saturated_fat_g: null, trans_fat_g: null, omega3_g: null,
            sugar_g: null, fiber_g: null, source: 'gemini_fallback',
          };
        }
      }
      items.push({ parsed: item, nutrients });
    }

    const analysis = aggregate(items);
    const latencyMs = Date.now() - startedAt;

    // Prompt 186 Phase 3: Atwater consistency check on the photo channel
    // (previously text-only). Runs only when all four inputs are known;
    // failure or unknown macros downgrade confidence and log a structured
    // warning. Never silently display internally inconsistent macros.
    const macrosKnown =
      analysis.calories !== null && analysis.protein_g !== null &&
      analysis.carbs_g !== null && analysis.total_fat_g !== null;
    const macroDerivedKcal = macrosKnown
      ? 4 * (analysis.protein_g as number) + 4 * (analysis.carbs_g as number) + 9 * (analysis.total_fat_g as number)
      : 0;
    const reconciliationRatio =
      macrosKnown && (analysis.calories as number) > 0 ? macroDerivedKcal / (analysis.calories as number) : 0;
    const reconciliationPassed =
      macrosKnown && reconciliationRatio >= 0.80 && reconciliationRatio <= 1.20;
    if (!reconciliationPassed) {
      safeLog.warn('api.nutrition.analyze-photo', 'atwater reconciliation failed or skipped', {
        macro_kcal: Math.round(macroDerivedKcal * 100) / 100,
        stated_kcal: analysis.calories,
        ratio: Math.round(reconciliationRatio * 10000) / 10000,
        macros_known: macrosKnown,
        nutrient_flags: analysis.nutrient_flags ?? null,
      });
    }
    const knownNutrients = {
      calories_kcal: analysis.calories !== null,
      protein_g: analysis.protein_g !== null,
      carbs_g: analysis.carbs_g !== null,
      fat_total_g: analysis.total_fat_g !== null,
      fiber_g: analysis.fiber_g !== null,
      sugar_g: analysis.sugar_g !== null,
      sodium_mg: analysis.sodium_mg != null,
    };
    const downgradedByItems = analysis.nutrient_flags?.downgraded === true;
    // Vision-model confidence range is 0.50 to 0.85 per spec Section 4.3;
    // 0.65 is the healthy mid, 0.50 the floor for downgraded/inconsistent.
    const sourceConfidence = reconciliationPassed && !downgradedByItems ? 0.65 : 0.50;
    const prompt186Meta = {
      version: '186-2026-06-11',
      reconciliation: {
        macro_kcal: Math.round(macroDerivedKcal * 100) / 100,
        stated_kcal: analysis.calories,
        ratio: Math.round(reconciliationRatio * 10000) / 10000,
        threshold: 0.20,
        passed: reconciliationPassed,
        skipped_unknown_macros: !macrosKnown,
      },
      known_nutrients: knownNutrients,
      nutrient_flags: analysis.nutrient_flags ?? null,
      estimated: true,
    };

    // Prompt 168 Apply C: Path A dual-write.
    // Step 1: insert into canonical `meals` first (best effort; failure does
    // not block the legacy nutrition_logs insert). Source = 'photo_ai',
    // confidence default 0.65 (mid of the 0.50 to 0.85 vision-model range per
    // spec Section 4.3).
    // Per Gary 2026-05-15: compute Gordon score before insert via the shared
    // helper so the same algorithm runs across all 4 meal channels.
    // Prompt 184b: intrinsic fat breakdown (saturated from USDA, source null).
    // Prompt 186: unknown fat passes 0 into the breakdown accounting only;
    // the meals row keeps NULL and knownNutrients excludes it from scoring.
    const fatBreakdown = resolveFatBreakdown({
      intrinsicTotalFatG: analysis.total_fat_g ?? 0,
      intrinsicSaturatedG: analysis.saturated_fat_g ?? 0,
      addedFatG: 0,
      source: null,
    });

    let scoredColumns;
    try {
      scoredColumns = await scoreMealForServerInsert(supabase, {
        userId: user.id,
        loggedAt,
        mealType,
        source: 'photo_ai',
        sourceConfidence,
        proteinG: analysis.protein_g ?? 0,
        carbsG: analysis.carbs_g ?? 0,
        fatTotalG: analysis.total_fat_g ?? 0,
        fatSourceId: null,
        fatBreakdown,
        fiberG: analysis.fiber_g ?? 0,
        sugarG: analysis.sugar_g ?? 0,
        sodiumMg: analysis.sodium_mg ?? 0,
        caloriesKcal: analysis.calories ?? 0,
        caloriesAutoCalc: false,
        wholeFoodFlag: null,
        mealName: analysis.serving_description ?? null,
        knownNutrients,
      });
    } catch (e) {
      safeLog.warn('api.nutrition.analyze-photo', 'gordon score compute failed (continuing with null)', {
        error: e instanceof Error ? e.message : String(e),
      });
      scoredColumns = { quality_score: null, quality_tier: null, score_breakdown: null, scored_at: null, gordon_version: null, fat_quality_contribution: null };
    }

    let mealId: string | null = null;
    try {
      const mealsInsert = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('meals' as any)
        .insert({
          user_id: user.id,
          logged_at: loggedAt,
          meal_type: mealType,
          source: 'photo_ai',
          source_confidence: sourceConfidence,
          protein_g: analysis.protein_g,
          carbs_g: analysis.carbs_g,
          fat_total_g: analysis.total_fat_g,
          fat_source_id: null,
          fat_breakdown: fatBreakdown,
          fiber_g: analysis.fiber_g,
          sugar_g: analysis.sugar_g,
          // Prompt 186: unknown sodium is NULL, never a silent 0.
          sodium_mg: analysis.sodium_mg ?? null,
          calories_kcal: analysis.calories,
          calories_auto_calc: false,
          meal_name: analysis.serving_description ?? null,
          notes: analysis.ai_notes ?? null,
          raw_input: {
            photo_url: storagePath, context_note: note || null,
            ai_model: GEMINI_MODEL, route: ROUTE,
          },
          ...scoredColumns,
          score_breakdown: {
            ...((scoredColumns.score_breakdown as Record<string, unknown> | null) ?? {}),
            prompt_186_meta: prompt186Meta,
          },
        })
        .select('meal_id')
        .single();
      if (mealsInsert.error || !mealsInsert.data) {
        safeLog.warn('api.nutrition.analyze-photo', 'meals insert failed (continuing to legacy)', {
          error: mealsInsert.error?.message,
        });
      } else {
        const mid = (mealsInsert.data as { meal_id?: string }).meal_id;
        mealId = typeof mid === 'string' ? mid : null;
      }
    } catch (e) {
      safeLog.warn('api.nutrition.analyze-photo', 'meals insert threw (continuing to legacy)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id, logged_at: loggedAt, meal_type: mealType,
        source: 'photo_ai', photo_url: storagePath, context_note: note || null,
        serving_description: analysis.serving_description,
        calories: analysis.calories, protein_g: analysis.protein_g, carbs_g: analysis.carbs_g,
        total_fat_g: analysis.total_fat_g, good_fat_g: null,
        healthy_fat_g: null, saturated_fat_g: analysis.saturated_fat_g,
        sugar_g: analysis.sugar_g, fiber_g: analysis.fiber_g,
        confidence: analysis.confidence, ai_notes: analysis.ai_notes,
        ai_model: GEMINI_MODEL, ai_latency_ms: latencyMs,
        data_source: analysis.data_source, status: 'pending_review',
      })
      .select('id').single();
    if (insErr || !inserted) {
      // Prompt 168 Apply C: rollback orphan meals row if legacy insert failed.
      if (mealId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('meals' as any).delete().eq('meal_id', mealId);
        } catch (delErr) {
          safeLog.warn('api.nutrition.analyze-photo', 'orphan meals delete failed', {
            mealId, error: delErr instanceof Error ? delErr.message : String(delErr),
          });
        }
      }
      throw new AIRouteError('UNKNOWN', `insert: ${insErr?.message}`, 500, 'Could not save draft. Try again.');
    }

    // Prompt 168 Apply C: link meals row back to legacy id for dashboard UNION dedupe.
    if (mealId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('meals' as any)
          .update({ legacy_nutrition_log_id: inserted.id })
          .eq('meal_id', mealId);
      } catch (linkErr) {
        safeLog.warn('api.nutrition.analyze-photo', 'legacy link update failed', {
          mealId, legacyId: inserted.id,
          error: linkErr instanceof Error ? linkErr.message : String(linkErr),
        });
      }
    }

    // Prompt #168d Step 8: emit Helix bridge event for the photo_ai channel.
    // Best-effort; failure logs but does not affect the save response.
    try {
      await awardNutritionLogPoints({ userId: user.id, source: 'photo_ai' });
    } catch (rewardErr) {
      safeLog.warn('api.nutrition.analyze-photo', 'helix award failed', {
        userId: user.id,
        error: rewardErr instanceof Error ? rewardErr.message : String(rewardErr),
      });
    }

    await recordAudit({
      requestId, userId: user.id, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'success', httpStatus: 200,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      latencyMs, costUsd: estimateCostUsd(GEMINI_MODEL, usage.inputTokens, usage.outputTokens),
    });

    return NextResponse.json({ logId: inserted.id, analysis, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again or enter manually.', err);
    safeLog.warn('api.nutrition.analyze-photo', 'failure', { code: ai.code, userId, message: ai.message });
    await recordAudit({
      requestId, userId, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'failure', errorCode: ai.code, httpStatus: ai.httpStatus,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: { code: ai.code, message: ai.userMessage, requestId } }, { status: ai.httpStatus });
  }
}
