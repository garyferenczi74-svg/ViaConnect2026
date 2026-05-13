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

    if (insErr || !inserted) throw new AIRouteError('UNKNOWN', `insert failed: ${insErr?.message}`, 500, 'Could not save draft. Try again.');

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
