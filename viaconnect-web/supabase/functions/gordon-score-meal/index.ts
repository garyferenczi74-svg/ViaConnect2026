// =============================================================================
// gordon-score-meal Edge Function (STUB, Build phase of Prompt 168)
// =============================================================================
// Loads a meal by meal_id, loads the user's active nutrition_targets row
// (auto-generates via gordon-generate-targets if absent), computes per-meal
// targets including the OQ#3 locked-on-save snack distribution, runs Gordon's
// quality scoring algorithm, persists quality_score + quality_tier +
// score_breakdown + scored_at + gordon_version on the meals row, and returns
// the scoring payload.
//
// Build-phase status: this is a STUB. The actual scoring algorithm body is
// Refine-phase work. Returns a placeholder Good-tier payload so the function
// shape deploys + responds with valid contract output before Refine fills in
// the real per-meal computation. See TODO marker below.
//
// Resilience: outer try/catch fail-open, 3-second timeout on Supabase reads
// and writes via Promise.race. Score calc failures never block meal save.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TIMEOUT_MS = 3000;
const GORDON_VERSION = 'gordon-1.0.0-stub';

interface ScoreMealRequest {
  meal_id: string;
}

interface ScoreModifier {
  name: string;
  value: number;
  note: string;
}

interface ScoreBreakdown {
  final_score: number;
  tier: 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'Perfection';
  base: number;
  modifiers: ScoreModifier[];
  calculated_at: string;
  gordon_version: string;
}

interface ScoreMealResponse {
  meal_id: string;
  quality_score: number;
  quality_tier: 'poor' | 'fair' | 'good' | 'excellent' | 'perfection';
  score_breakdown: ScoreBreakdown;
  gordon_version: string;
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout: ${label}`)), ms),
    ),
  ]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const body = (await req.json()) as ScoreMealRequest;
    if (!body?.meal_id) {
      return json({ error: 'meal_id required' }, 400);
    }

    const db = admin();

    // Load meal row.
    const mealResp = await withTimeout(
      db.from('meals').select('*').eq('meal_id', body.meal_id).maybeSingle(),
      TIMEOUT_MS,
      'load meal',
    );
    if (mealResp.error) {
      console.warn('[gordon-score-meal] meal load error', mealResp.error.message);
      return json({ error: 'meal load failed', detail: mealResp.error.message }, 500);
    }
    if (!mealResp.data) {
      return json({ error: 'meal not found', meal_id: body.meal_id }, 404);
    }
    const meal = mealResp.data;

    // Load active nutrition_targets row for this user.
    const targetsResp = await withTimeout(
      db
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', meal.user_id)
        .is('superseded_at', null)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle(),
      TIMEOUT_MS,
      'load nutrition_targets',
    );

    let targets = targetsResp.data;
    if (!targets) {
      // Auto-generate via sibling function. Best-effort: if the call fails the
      // stub still returns a valid placeholder payload.
      try {
        const gen = await withTimeout(
          fetch(`${SUPABASE_URL}/functions/v1/gordon-generate-targets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ user_id: meal.user_id }),
          }).then((r) => r.json()),
          TIMEOUT_MS,
          'generate-targets fallback',
        );
        targets = gen ?? null;
      } catch (e) {
        console.warn('[gordon-score-meal] generate-targets fallback failed', (e as Error).message);
      }
    }

    // TODO Refine phase: import scoreMeal from shared lib once
    // ../../../src/lib/gordon/scoreMeal.ts exists. The Refine implementation
    // will compute per-meal targets honoring OQ#3 (locked-on-save snack
    // divisor capped at 4) and run the additive modifier algorithm from
    // planning doc Section 3.4. For Build phase, return a placeholder so the
    // edge function deploys and yields a valid contract response.
    const placeholder: ScoreBreakdown = {
      final_score: 50,
      tier: 'Good',
      base: 50,
      modifiers: [],
      calculated_at: new Date().toISOString(),
      gordon_version: GORDON_VERSION,
    };

    // Persist back to meals row. Best-effort, non-blocking on failure.
    try {
      await withTimeout(
        db
          .from('meals')
          .update({
            quality_score: placeholder.final_score,
            quality_tier: placeholder.tier.toLowerCase(),
            score_breakdown: placeholder,
            scored_at: new Date().toISOString(),
            gordon_version: GORDON_VERSION,
          })
          .eq('meal_id', body.meal_id),
        TIMEOUT_MS,
        'persist score',
      );
    } catch (e) {
      console.warn('[gordon-score-meal] persist failed', (e as Error).message);
    }

    const payload: ScoreMealResponse = {
      meal_id: body.meal_id,
      quality_score: placeholder.final_score,
      quality_tier: placeholder.tier.toLowerCase() as ScoreMealResponse['quality_tier'],
      score_breakdown: placeholder,
      gordon_version: GORDON_VERSION,
    };
    return json(payload, 200);
  } catch (e) {
    // Fail-open: return error JSON, never throw out of the handler.
    console.warn('[gordon-score-meal] handler error', (e as Error).message);
    return json({ error: (e as Error).message ?? 'unknown error' }, 500);
  }
});
