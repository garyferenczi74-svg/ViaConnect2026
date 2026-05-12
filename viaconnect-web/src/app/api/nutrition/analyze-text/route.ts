// Prompt #160 section 4.1: text meal analysis endpoint.
// POST body: { description, mealType, loggedAt }
// Auth: Supabase session required.
// Returns: { logId, analysis } or error with appropriate status.

import { NextRequest, NextResponse } from 'next/server';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { createClient } from '@/lib/supabase/server';
import { TEXT_ANALYSIS_SYSTEM_PROMPT, NUTRITION_MODEL } from '@/lib/nutrition/prompts';
import { parseNutritionResponse } from '@/lib/nutrition/parse';
import { MealTypeSchema } from '@/lib/nutrition/schema';

const breaker = getCircuitBreaker('nutrition-text');
const TIMEOUT_MS = 12000;
const MIN_LEN = 5;
const MAX_LEN = 2000;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      safeLog.error('api.nutrition.analyze-text', 'ANTHROPIC_API_KEY missing', { userId: user.id });
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.description !== 'string') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const description: string = body.description.trim();
    if (description.length < MIN_LEN || description.length > MAX_LEN) {
      return NextResponse.json(
        { error: `Description must be ${MIN_LEN}-${MAX_LEN} characters` },
        { status: 400 },
      );
    }

    const mealTypeParse = MealTypeSchema.safeParse(body.mealType);
    if (!mealTypeParse.success) {
      return NextResponse.json({ error: 'Invalid mealType' }, { status: 400 });
    }
    const mealType = mealTypeParse.data;

    const loggedAt = typeof body.loggedAt === 'string' && !Number.isNaN(Date.parse(body.loggedAt))
      ? body.loggedAt
      : new Date().toISOString();

    let response: Response;
    try {
      response = await breaker.execute(() =>
        withAbortTimeout(
          (signal) => fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: NUTRITION_MODEL,
              max_tokens: 1024,
              system: TEXT_ANALYSIS_SYSTEM_PROMPT,
              messages: [{ role: 'user', content: description }],
            }),
            signal,
          }),
          TIMEOUT_MS,
          'api.nutrition.analyze-text',
        ),
      );
    } catch (apiErr) {
      if (isCircuitBreakerError(apiErr)) {
        safeLog.warn('api.nutrition.analyze-text', 'circuit open', { userId: user.id });
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
      }
      if (isTimeoutError(apiErr)) {
        safeLog.warn('api.nutrition.analyze-text', 'timeout', { userId: user.id });
        return NextResponse.json({ error: 'Analysis timed out. Try again.' }, { status: 504 });
      }
      safeLog.error('api.nutrition.analyze-text', 'fetch failed', { error: apiErr, userId: user.id });
      return NextResponse.json({ error: 'AI error' }, { status: 502 });
    }

    if (!response.ok) {
      const text = await response.text();
      safeLog.error('api.nutrition.analyze-text', 'non-2xx', {
        status: response.status,
        body: text.slice(0, 200),
        userId: user.id,
      });
      return NextResponse.json({ error: `AI error (${response.status})` }, { status: 502 });
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.text ?? '';

    let analysis;
    try {
      analysis = parseNutritionResponse(rawText);
    } catch (parseErr) {
      safeLog.error('api.nutrition.analyze-text', 'parse failed', {
        error: parseErr,
        userId: user.id,
        snippet: rawText.slice(0, 200),
      });
      return NextResponse.json({ error: 'Analysis failed. Try again or enter manually.' }, { status: 502 });
    }

    const latencyMs = Date.now() - startedAt;

    const { data: inserted, error: insertErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        logged_at: loggedAt,
        meal_type: mealType,
        source: 'manual_text',
        raw_input: description,
        serving_description: analysis.serving_description,
        calories: analysis.calories,
        protein_g: analysis.protein_g,
        carbs_g: analysis.carbs_g,
        total_fat_g: analysis.total_fat_g,
        good_fat_g: analysis.good_fat_g,
        healthy_fat_g: analysis.healthy_fat_g,
        saturated_fat_g: analysis.saturated_fat_g,
        sugar_g: analysis.sugar_g,
        fiber_g: analysis.fiber_g,
        confidence: analysis.confidence,
        ai_notes: analysis.ai_notes,
        ai_model: NUTRITION_MODEL,
        ai_latency_ms: latencyMs,
        status: 'pending_review',
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      safeLog.error('api.nutrition.analyze-text', 'insert failed', {
        error: insertErr,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Could not save draft' }, { status: 500 });
    }

    safeLog.info('api.nutrition.analyze-text', 'success', {
      userId: user.id,
      logId: inserted.id,
      inputLen: description.length,
      latencyMs,
      confidence: analysis.confidence,
    });

    return NextResponse.json({ logId: inserted.id, analysis });
  } catch (err) {
    safeLog.error('api.nutrition.analyze-text', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
