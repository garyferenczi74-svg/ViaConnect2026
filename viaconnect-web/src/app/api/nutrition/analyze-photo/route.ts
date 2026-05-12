// Prompt #160 section 4.2: photo meal analysis endpoint.
// POST multipart/form-data: image, mealType, loggedAt, optional note.
// Auth: Supabase session required.
// Returns: { logId, analysis } or error with appropriate status.

import { NextRequest, NextResponse } from 'next/server';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { createClient } from '@/lib/supabase/server';
import { PHOTO_ANALYSIS_SYSTEM_PROMPT, NUTRITION_MODEL } from '@/lib/nutrition/prompts';
import { parseNutritionResponse } from '@/lib/nutrition/parse';
import { MealTypeSchema } from '@/lib/nutrition/schema';

const breaker = getCircuitBreaker('nutrition-photo');
const TIMEOUT_MS = 20000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

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
      safeLog.error('api.nutrition.analyze-photo', 'ANTHROPIC_API_KEY missing', { userId: user.id });
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
    }

    const image = form.get('image');
    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }
    if (image.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 400 });
    }
    const mime = image.type.toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      if (mime === 'image/heic' || mime === 'image/heif') {
        return NextResponse.json(
          { error: 'HEIC not supported yet. Please use JPG or PNG.' },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    const mealTypeParse = MealTypeSchema.safeParse(form.get('mealType'));
    if (!mealTypeParse.success) {
      return NextResponse.json({ error: 'Invalid mealType' }, { status: 400 });
    }
    const mealType = mealTypeParse.data;

    const loggedAtRaw = form.get('loggedAt');
    const loggedAt = typeof loggedAtRaw === 'string' && !Number.isNaN(Date.parse(loggedAtRaw))
      ? loggedAtRaw
      : new Date().toISOString();

    const noteRaw = form.get('note');
    const note = typeof noteRaw === 'string' ? noteRaw.slice(0, 500).trim() : '';

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const ym = new Date().toISOString().slice(0, 7);
    const fileId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const storagePath = `${user.id}/${ym}/${fileId}.${ext}`;

    const buf = Buffer.from(await image.arrayBuffer());

    const uploadResult = await supabase.storage
      .from('nutrition-photos')
      .upload(storagePath, buf, { contentType: mime, upsert: false });

    if (uploadResult.error) {
      safeLog.error('api.nutrition.analyze-photo', 'storage upload failed', {
        error: uploadResult.error,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Couldn't upload the photo. Check your connection." },
        { status: 503 },
      );
    }

    const base64 = buf.toString('base64');

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
              system: PHOTO_ANALYSIS_SYSTEM_PROMPT,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
                  { type: 'text', text: note ? `Context from user: ${note}` : 'Analyze this meal.' },
                ],
              }],
            }),
            signal,
          }),
          TIMEOUT_MS,
          'api.nutrition.analyze-photo',
        ),
      );
    } catch (apiErr) {
      if (isCircuitBreakerError(apiErr)) {
        safeLog.warn('api.nutrition.analyze-photo', 'circuit open', { userId: user.id });
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
      }
      if (isTimeoutError(apiErr)) {
        safeLog.warn('api.nutrition.analyze-photo', 'timeout', { userId: user.id });
        return NextResponse.json({ error: 'Analysis timed out. Try again.' }, { status: 504 });
      }
      safeLog.error('api.nutrition.analyze-photo', 'fetch failed', { error: apiErr, userId: user.id });
      return NextResponse.json({ error: 'AI error' }, { status: 502 });
    }

    if (!response.ok) {
      const text = await response.text();
      safeLog.error('api.nutrition.analyze-photo', 'non-2xx', {
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
      safeLog.error('api.nutrition.analyze-photo', 'parse failed', {
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
        source: 'photo_ai',
        photo_url: storagePath,
        context_note: note || null,
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
      safeLog.error('api.nutrition.analyze-photo', 'insert failed', {
        error: insertErr,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Could not save draft' }, { status: 500 });
    }

    safeLog.info('api.nutrition.analyze-photo', 'success', {
      userId: user.id,
      logId: inserted.id,
      fileSizeKb: Math.round(image.size / 1024),
      latencyMs,
      confidence: analysis.confidence,
    });

    return NextResponse.json({ logId: inserted.id, analysis });
  } catch (err) {
    safeLog.error('api.nutrition.analyze-photo', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
