// Prompt #164: photo meal analysis using Gemini 2.5 Flash Vision + USDA.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { MealTypeSchema } from '@/lib/nutrition/schema';
import { parseImageWithGemini, estimateItemWithGemini } from '@/lib/nutrition/gemini-client';
import { lookupFood } from '@/lib/nutrition/usda-client';
import { aggregate, type AggregatedItem } from '@/lib/nutrition/aggregate';
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
      const usda = await lookupFood(item.name, item.quantity, item.unit).catch(() => null);
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

    // Prompt 168 Apply C: Path A dual-write.
    // Step 1: insert into canonical `meals` first (best effort; failure does
    // not block the legacy nutrition_logs insert). Source = 'photo_ai',
    // confidence default 0.65 (mid of the 0.50 to 0.85 vision-model range per
    // spec Section 4.3).
    // Per Gary 2026-05-15: compute Gordon score before insert via the shared
    // helper so the same algorithm runs across all 4 meal channels.
    let scoredColumns;
    try {
      scoredColumns = await scoreMealForServerInsert(supabase, {
        userId: user.id,
        loggedAt,
        mealType,
        source: 'photo_ai',
        sourceConfidence: 0.65,
        proteinG: analysis.protein_g,
        carbsG: analysis.carbs_g,
        fatTotalG: analysis.total_fat_g,
        fatHealthyG: analysis.healthy_fat_g,
        fiberG: analysis.fiber_g,
        sugarG: analysis.sugar_g,
        sodiumMg: 0,
        caloriesKcal: analysis.calories,
        caloriesAutoCalc: false,
        wholeFoodFlag: null,
        mealName: analysis.serving_description ?? null,
      });
    } catch (e) {
      safeLog.warn('api.nutrition.analyze-photo', 'gordon score compute failed (continuing with null)', {
        error: e instanceof Error ? e.message : String(e),
      });
      scoredColumns = { quality_score: null, quality_tier: null, score_breakdown: null, scored_at: null, gordon_version: null };
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
          source_confidence: 0.65,
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
          raw_input: {
            photo_url: storagePath, context_note: note || null,
            ai_model: GEMINI_MODEL, route: ROUTE,
          },
          ...scoredColumns,
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
        total_fat_g: analysis.total_fat_g, good_fat_g: analysis.good_fat_g,
        healthy_fat_g: analysis.healthy_fat_g, saturated_fat_g: analysis.saturated_fat_g,
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
