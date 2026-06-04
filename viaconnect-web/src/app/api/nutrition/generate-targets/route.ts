// =============================================================================
// Prompt 173 Phase 5 (rebuild on main 2026-06-03): canonical nutrition_targets
// writer.
//
// Session-authed. The ONLY place rows are written to public.nutrition_targets;
// the table's INSERT and UPDATE policies were dropped in
// 20260603110000_prompt_173_nutrition_targets_macro_extension.sql so no
// client can write directly. This route uses the service-role client to
// supersede the prior active row and insert a new effective-dated row, and
// the basis JSON column captures every input + decision + clamp the Phase 4
// engine fired so the result is fully auditable.
//
// Inputs (Section 5.2) - resolved from existing main surfaces:
//   * Weight goal (current + goal + direction) -> user_weight_goals via
//     readWeightGoal (Phase 2 accessor).
//   * Demographics (height, age, biological sex) -> assessment_results Phase 1
//     (the "1" key in our CAQ DB schema).
//   * Activity level -> assessment_results Phase 3 (Lifestyle) for now;
//     Phase 7 reconciles with Body Tracker weight logs.
//   * Disordered-eating safety -> profiles.body_scan_de_response via the
//     safeguard stub (defaults to inactive when the column is absent).
//
// Missing inputs return 422 with the structured estimate_unavailable from
// the engine; the caller renders "complete your profile" rather than a
// fabricated number (Section 5.2).
//
// Phase 5 fills the non-Phase-4 nutrition_targets columns (fat saturated,
// fat unsat, fiber, sugar, sodium) with conservative USDA defaults so the
// row satisfies the NOT NULL constraints. Phase 8 (173a) replaces fiber
// with the calorie-target-driven 14 g per 1000 kcal computation.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readWeightGoal } from '@/lib/weight-goals/accessor';
import {
  generateMacroTargets,
  type BiologicalSex,
  type SafetyFlags,
} from '@/lib/gordon/generateMacroTargets';
import {
  ACTIVITY_MULTIPLIERS,
  type MacroActivityLevel,
} from '@/lib/gordon/macro-config';
import { readActiveHistoryFromProfiles } from '@/lib/body-tracker/disordered-eating-safeguard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// USDA fallback defaults for the columns Phase 4 does not yet compute. Phase
// 8 (173a) replaces dailyFiberG with the 14 g per 1000 kcal calorie-target
// formula and the rest stay until a future engine pass owns them.
const USDA_DEFAULT_FIBER_G = 28;
const USDA_DEFAULT_SUGAR_G = 50;
const USDA_DEFAULT_SODIUM_MG = 2300;

const DEFAULT_MEAL_DISTRIBUTION = {
  breakfast: 0.25,
  lunch: 0.30,
  dinner: 0.30,
  snack: 0.075,
  snackDivisorCap: 4,
};

const GORDON_VERSION = 'gordon-1.0.0-weight-goal-driven';

interface ResolvedInputs {
  weightGoal: Awaited<ReturnType<typeof readWeightGoal>>;
  heightCm: number | null;
  age: number | null;
  biologicalSex: BiologicalSex | null;
  activityLevel: MacroActivityLevel | null;
  currentWeightKg: number | null;
}

function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeSex(value: unknown): BiologicalSex | null {
  if (typeof value !== 'string') return null;
  const v = value.toLowerCase().trim();
  if (v === 'male' || v === 'm') return 'male';
  if (v === 'female' || v === 'f') return 'female';
  if (v === 'unspecified' || v === 'non_binary' || v === 'nonbinary' || v === 'other' || v === 'prefer_not_to_say') return 'unspecified';
  return null;
}

function normalizeActivity(value: unknown): MacroActivityLevel | null {
  if (typeof value !== 'string') return null;
  const v = value.toLowerCase().trim().replace(/[\s-]/g, '_');
  if (v in ACTIVITY_MULTIPLIERS) return v as MacroActivityLevel;
  // Tolerate legacy short forms used in main's existing CAQ data.
  if (v === 'light') return 'lightly_active';
  if (v === 'moderate') return 'moderately_active';
  if (v === 'very') return 'very_active';
  if (v === 'athlete' || v === 'extra') return 'extra_active';
  return null;
}

// Compute age in years from a YYYY-MM-DD DOB string. Returns null on bad input.
function ageFromDob(dob: unknown): number | null {
  if (typeof dob !== 'string') return null;
  const d = new Date(dob);
  if (!Number.isFinite(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

// Body Tracker stores weight in pounds. Convert to kg with the canonical
// 2.20462 lbs/kg factor mirrored from guardrails (avoiding the import here
// keeps the resolver dep graph thin).
const LBS_PER_KG = 2.20462;

async function resolveInputs(
  userId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<ResolvedInputs> {
  // Weight goal (Phase 2 canonical store).
  const weightGoal = await readWeightGoal(userId, supabase);

  // Body Tracker most-recent weight log. Phase 7 precedence (Section 7):
  // the most recent body_tracker_weight log wins as the live current
  // weight, else fall back to the weight-goal snapshot, else Demographics.
  // body_tracker_weight stores weight_lbs; convert to kg here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestWeightRow } = await (supabase as any)
    .from('body_tracker_weight')
    .select('weight_lbs, entry:body_tracker_entries!inner(user_id, entry_date)')
    .eq('entry.user_id', userId)
    .order('entry(entry_date)', { ascending: false })
    .limit(1)
    .maybeSingle();
  const bodyTrackerWeightLbs = numericOrNull(latestWeightRow?.weight_lbs);
  const bodyTrackerWeightKg =
    bodyTrackerWeightLbs !== null ? bodyTrackerWeightLbs / LBS_PER_KG : null;

  // Demographics + Lifestyle via assessment_results phase JSON. The phase
  // numeric IDs are the DB-stored values, not the user-facing position.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: phaseRows } = await (supabase as any)
    .from('assessment_results')
    .select('phase, data')
    .eq('user_id', userId)
    .in('phase', [1, 3]);

  const phase1 = (Array.isArray(phaseRows) ? phaseRows : [])
    .find((r: { phase: number }) => r.phase === 1)?.data as Record<string, unknown> | undefined;
  const phase3 = (Array.isArray(phaseRows) ? phaseRows : [])
    .find((r: { phase: number }) => r.phase === 3)?.data as Record<string, unknown> | undefined;

  // Demographics: height (cm), weight (kg), age OR dob, sex.
  const heightCm = numericOrNull(phase1?.height);
  // Current weight precedence (Section 7, documented in code):
  //   1. Most recent body_tracker_weight log (live).
  //   2. weight_goal snapshot (last CAQ entry).
  //   3. Demographics weight (CAQ Phase 1 capture).
  // The resolver favors freshness; the snapshots are last-known-good only.
  const demographicsWeightKg = numericOrNull(phase1?.weight);
  const currentWeightKg =
    bodyTrackerWeightKg ?? weightGoal?.currentWeightKg ?? demographicsWeightKg;
  const age = numericOrNull(phase1?.age) ?? ageFromDob(phase1?.dob);
  const biologicalSex = normalizeSex(phase1?.sex);

  // Activity level lives inside the Lifestyle (phase 3) payload as
  // `exercise` in the existing CAQ shape (e.g., "sedentary" / "moderate").
  const activityLevel =
    normalizeActivity(phase3?.exercise) ??
    normalizeActivity(phase3?.activityLevel);

  return {
    weightGoal,
    heightCm,
    age,
    biologicalSex,
    activityLevel,
    currentWeightKg,
  };
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve inputs against existing main surfaces.
  let inputs: ResolvedInputs;
  try {
    inputs = await resolveInputs(user.id, supabase);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to resolve macro inputs', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }

  // Safety signal (defaults to false on a missing column / row / network
  // error; the stub safeguard returns false in any of those cases).
  const deSafetyActive = await readActiveHistoryFromProfiles(supabase);
  const safety: SafetyFlags = { deSafetyActive };

  // Phase 4 engine.
  const result = generateMacroTargets({
    body:
      inputs.currentWeightKg !== null &&
      inputs.heightCm !== null &&
      inputs.age !== null &&
      inputs.biologicalSex !== null
        ? {
            currentWeightKg: inputs.currentWeightKg,
            heightCm: inputs.heightCm,
            age: inputs.age,
            biologicalSex: inputs.biologicalSex,
          }
        : null,
    activityLevel: inputs.activityLevel,
    weightGoal:
      inputs.weightGoal !== null
        ? {
            goalWeightKg: inputs.weightGoal.goalWeightKg,
            goalDirection: inputs.weightGoal.goalDirection,
          }
        : null,
    safety,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: 'estimate_unavailable', missing: result.missing },
      { status: 422 },
    );
  }

  // Service-role write. RLS INSERT and UPDATE policies were dropped in the
  // Phase 5 migration so the admin client is the sole writer; the session
  // user_id is preserved on the row from the auth gate above.
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Supersede any existing active row so the "active = superseded_at IS
  // NULL" invariant the read hook relies on stays consistent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: supersedeErr } = await (admin as any)
    .from('nutrition_targets')
    .update({ superseded_at: nowIso })
    .eq('user_id', user.id)
    .is('superseded_at', null);
  if (supersedeErr) {
    return NextResponse.json(
      { error: 'Failed to supersede prior targets', detail: supersedeErr.message },
      { status: 500 },
    );
  }

  // Fat saturated and unsaturated stay USDA-shape until the Phase 8 rewrite
  // owns them: saturated <= 10% of kcal cap; unsaturated fills the rest.
  const fatSaturatedG = Math.round((result.targets.calorieTargetKcal * 0.10) / 9 * 10) / 10;
  const fatUnsatG = Math.max(0, Math.round((result.targets.fatG - fatSaturatedG) * 10) / 10);

  const insertRow = {
    user_id: user.id,
    effective_from: nowIso,
    daily_kcal: result.targets.calorieTargetKcal,
    daily_protein_g: result.targets.proteinG,
    daily_carbs_g: result.targets.carbG,
    daily_fat_total_g: result.targets.fatG,
    daily_fat_saturated_g: fatSaturatedG,
    daily_fat_unsat_g: fatUnsatG,
    daily_fiber_g: USDA_DEFAULT_FIBER_G,
    daily_sugar_g: USDA_DEFAULT_SUGAR_G,
    daily_sodium_mg: USDA_DEFAULT_SODIUM_MG,
    source_caq_snapshot: {},
    source_body_snapshot: {
      currentWeightKg: inputs.currentWeightKg,
      heightCm: inputs.heightCm,
      age: inputs.age,
      biologicalSex: inputs.biologicalSex,
    },
    bio_opt_day: null,
    meal_distribution: DEFAULT_MEAL_DISTRIBUTION,
    generated_by_version: GORDON_VERSION,
    generated_at: nowIso,
    superseded_at: null,
    // Phase 5 new columns.
    goal_direction: result.basis.effectiveDirection,
    goal_weight_kg: inputs.weightGoal?.goalWeightKg ?? null,
    current_weight_kg: inputs.currentWeightKg,
    conservative_path: result.basis.conservativePath,
    conservative_reason: result.basis.conservativeReason,
    macro_basis: result.basis,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (admin as any)
    .from('nutrition_targets')
    .insert(insertRow)
    .select('*')
    .single();
  if (insertErr) {
    return NextResponse.json(
      { error: 'Failed to write nutrition_targets row', detail: insertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, target: inserted });
}
