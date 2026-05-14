// =============================================================================
// gordon-generate-targets Edge Function (STUB, Build phase of Prompt 168)
// =============================================================================
// Reads the user's latest completed CAQ snapshot and biometric profile, then
// computes personalized daily nutrition targets via Mifflin-St Jeor BMR plus
// activity factor adjustment plus goal-based kcal delta, per planning doc
// Section 3.2. Inserts the result into nutrition_targets and supersedes the
// previous active row.
//
// CAQ read strategy honors the Outline-phase CAQ phase remap: spec phases
// 1/2/3/7 map to actual code phases 1/6/(7+8+9)/3. The handler attempts the
// rpc('get_latest_completed_caq') first; if absent (per the local-vs-live
// migration drift memo) it falls back to phase-by-phase reads using the actual
// code phase numbers.
//
// Build-phase status: this is a STUB. The handler shape, input/output
// interfaces, BMR formula constants, and the Supabase insert + supersede flow
// are wired. The per-CAQ-input adjustment logic (sodium tightening on CV
// flag, sugar tightening on diabetes flag, fiber ramp on digestive flag, etc.)
// is left as TODO for Refine phase, which builds the full lib code. Returns
// adult-default placeholder targets so the function shape works end-to-end.
//
// Resilience: outer try/catch fail-open, 3-second timeout on Supabase ops via
// Promise.race.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TIMEOUT_MS = 3000;
const GENERATED_BY_VERSION = 'gordon-1.0.0-stub';

// Mifflin-St Jeor + activity factor + goal adjustment constants are duplicated
// here (instead of imported from src/lib/gordon/constants) because edge
// functions run in Deno and cannot cross the src/ boundary directly. Refine
// phase will keep these in lockstep with src/lib/gordon/constants.ts.
const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
} as const;

const GOAL_KCAL_ADJUSTMENT = {
  loss: -500,
  maintenance: 0,
  gain: 300,
  recomposition: -200,
} as const;

const PROTEIN_GRAMS_PER_KG_DEFAULT = {
  loss: 1.8,
  maintenance: 1.4,
  gain: 1.8,
  recomposition: 2.2,
} as const;

const DEFAULT_MEAL_DISTRIBUTION = {
  breakfast: 0.25,
  lunch: 0.30,
  dinner: 0.30,
  snack: 0.075,
  snackDivisorCap: 4,
};

// Adult default placeholder used when CAQ is absent or Refine logic not yet
// in place. 2000 kcal generic adult per WHO, evenly split macros.
const ADULT_DEFAULT_TARGETS = {
  daily_kcal: 2000,
  daily_protein_g: 100,
  daily_carbs_g: 250,
  daily_fat_total_g: 67,
  daily_fat_saturated_g: 22,
  daily_fat_unsat_g: 45,
  daily_fiber_g: 28,
  daily_sugar_g: 50,
  daily_sodium_mg: 2300,
};

interface GenerateTargetsRequest {
  user_id: string;
}

interface GenerateTargetsResponse {
  target_id: string;
  daily_kcal: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_total_g: number;
  daily_fat_saturated_g: number;
  daily_fat_unsat_g: number;
  daily_fiber_g: number;
  daily_sugar_g: number;
  daily_sodium_mg: number;
  meal_distribution: typeof DEFAULT_MEAL_DISTRIBUTION;
  generated_by_version: string;
  generated_at: string;
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

// Reads CAQ snapshot using the RPC-first, phase-fallback strategy from the
// Outline phase. Returns null if neither path yields data.
async function loadCaqSnapshot(db: SupabaseClient, userId: string): Promise<unknown | null> {
  try {
    const rpc = await withTimeout(
      db.rpc('get_latest_completed_caq', { p_user_id: userId }),
      TIMEOUT_MS,
      'rpc get_latest_completed_caq',
    );
    if (rpc && !rpc.error && rpc.data) return rpc.data;
  } catch (_e) {
    // RPC missing in local; fall through to phase reads.
  }

  // Fallback: read actual code phases 1, 6, (7,8,9), 3. Spec phase mapping is
  // 1->1 (demographics), 2->6 (concerns + family hx), 3->(7+8+9) (physical
  // symptoms), 7->3 (lifestyle).
  try {
    const phases = await withTimeout(
      db
        .from('caq_phase_responses')
        .select('phase_number, responses')
        .eq('user_id', userId)
        .in('phase_number', [1, 3, 6, 7, 8, 9]),
      TIMEOUT_MS,
      'caq_phase_responses fallback',
    );
    if (!phases.error && Array.isArray(phases.data) && phases.data.length > 0) {
      return phases.data;
    }
  } catch (e) {
    console.warn('[gordon-generate-targets] phase fallback failed', (e as Error).message);
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const body = (await req.json()) as GenerateTargetsRequest;
    if (!body?.user_id) {
      return json({ error: 'user_id required' }, 400);
    }

    const db = admin();

    const caqSnapshot = await loadCaqSnapshot(db, body.user_id);
    void caqSnapshot; // TODO Refine phase: feed this into Mifflin-St Jeor.

    // Read profile snapshot (best-effort).
    let bodySnapshot: unknown | null = null;
    try {
      const profile = await withTimeout(
        db
          .from('profiles')
          .select('weight_kg, height_cm, age, biological_sex')
          .eq('user_id', body.user_id)
          .maybeSingle(),
        TIMEOUT_MS,
        'load profile',
      );
      if (!profile.error && profile.data) bodySnapshot = profile.data;
    } catch (e) {
      console.warn('[gordon-generate-targets] profile load failed', (e as Error).message);
    }

    // TODO Refine phase: replace the adult-default placeholder with full
    // Mifflin-St Jeor + activity factor + goal-based kcal delta + per-CAQ
    // adjustments (sodium tightening on CV flag, sugar tightening on diabetes
    // flag, fiber ramp on digestive flag, kidney protein cap, etc.). The
    // ACTIVITY_FACTORS, GOAL_KCAL_ADJUSTMENT, and PROTEIN_GRAMS_PER_KG_DEFAULT
    // constants above are intentionally pre-loaded for Refine to use.
    void ACTIVITY_FACTORS;
    void GOAL_KCAL_ADJUSTMENT;
    void PROTEIN_GRAMS_PER_KG_DEFAULT;

    const targets = ADULT_DEFAULT_TARGETS;

    // Supersede previous active row.
    try {
      await withTimeout(
        db
          .from('nutrition_targets')
          .update({ superseded_at: new Date().toISOString() })
          .eq('user_id', body.user_id)
          .is('superseded_at', null),
        TIMEOUT_MS,
        'supersede previous',
      );
    } catch (e) {
      console.warn('[gordon-generate-targets] supersede failed', (e as Error).message);
    }

    // Insert new row.
    const insertResp = await withTimeout(
      db
        .from('nutrition_targets')
        .insert({
          user_id: body.user_id,
          ...targets,
          source_caq_snapshot: caqSnapshot ?? {},
          source_body_snapshot: bodySnapshot,
          bio_opt_day: null,
          meal_distribution: DEFAULT_MEAL_DISTRIBUTION,
          generated_by_version: GENERATED_BY_VERSION,
        })
        .select('target_id, generated_at')
        .single(),
      TIMEOUT_MS,
      'insert nutrition_targets',
    );

    if (insertResp.error || !insertResp.data) {
      console.warn('[gordon-generate-targets] insert error', insertResp.error?.message);
      return json({ error: 'insert failed', detail: insertResp.error?.message }, 500);
    }

    const payload: GenerateTargetsResponse = {
      target_id: insertResp.data.target_id,
      ...targets,
      meal_distribution: DEFAULT_MEAL_DISTRIBUTION,
      generated_by_version: GENERATED_BY_VERSION,
      generated_at: insertResp.data.generated_at,
    };
    return json(payload, 200);
  } catch (e) {
    console.warn('[gordon-generate-targets] handler error', (e as Error).message);
    return json({ error: (e as Error).message ?? 'unknown error' }, 500);
  }
});
