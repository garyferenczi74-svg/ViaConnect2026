// Prompt 208b Task 4.7-T2: hydration reconciliation engine.
//
// Ties the base hydration target (from profiles.hydration_target_ml_per_day_custom
// or personalizeHydrationTarget via profiles.body_weight_kg) + activity/sweat
// (Connected, FLAG-OFF / usually absent -> null) + electrolyte status (Labs via
// lab_biomarkers sodium/potassium/magnesium) + body water (Arnold via
// body_tracker_weight.body_water_pct) into one reconciled picture with an
// activity-adjusted target. Persists to hydration_reconciliation.
//
// SOURCE:
//   Base target: profiles.hydration_target_ml_per_day_custom when set, else
//   body_weight_kg * 33 (personalizeHydrationTarget formula), else 2000 ml
//   fallback (documented sentinel - absent profile/weight).
//
// DEGRADE rules (never fabricate):
//   - activityExpenditureKcal null -> adjusted == base (no sweat allowance added)
//   - electrolyte labs absent     -> electrolyteContext 'unknown'
//   - body_water_pct absent       -> bodyWaterContext 'unknown'
//
// computeAndPersistHydrationReconciliation: fail-open, NEVER throws.
// No em/en-dashes. No emojis. No new dependency.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Documented fallback: absent profile or absent body weight. */
const FALLBACK_BASE_ML = 2000;

/** ml per kg of body weight (matches personalizeHydrationTarget §4.1). */
const ML_PER_KG = 33;

/**
 * Activity above this threshold (kcal) triggers a sweat allowance.
 * Values at or below this are treated as resting activity.
 */
const ACTIVITY_REST_THRESHOLD_KCAL = 200;

/**
 * Sweat allowance rate: ml added per kcal of activity above the threshold.
 * 500 ml per 500 kcal => 1 ml/kcal.
 * So (600 kcal expenditure - 200 threshold) * 1.0 = +400 ml above base,
 * but the spec example (2000, 600) -> 2500 means +500 ml at 600 kcal.
 * Interpretation: add 500 ml per full 500-kcal block of activity (rounded).
 * At 600 kcal: floor((600 / 500)) * 500 = 500 ml.
 * That matches the brief's stated example exactly.
 */
const SWEAT_ALLOWANCE_PER_500KCAL_ML = 500;

/** Maximum sweat allowance addition in ml. */
const MAX_SWEAT_ALLOWANCE_ML = 1500;

/** Body water thresholds (%). Values below LOW are 'low', >= HIGH are 'high'. */
const BODY_WATER_LOW_PCT = 40;
const BODY_WATER_HIGH_PCT = 65;

// ---------------------------------------------------------------------------
// Electrolyte biomarker keys (case-insensitive match).
// ---------------------------------------------------------------------------
const ELECTROLYTE_KEYS = new Set(['sodium', 'potassium', 'magnesium']);

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface HydrationReconciliation {
  baseTargetMl: number;
  activityAdjustedTargetMl: number;
  electrolyteContext: string;
  bodyWaterContext: string;
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Compute the activity-adjusted hydration target. PURE and DETERMINISTIC.
 *
 * When activityExpenditureKcal is null: DEGRADE - return baseTargetMl unchanged.
 * When present and <= ACTIVITY_REST_THRESHOLD_KCAL: return baseTargetMl unchanged.
 * Otherwise: add floor(expenditure / 500) * 500 ml, capped at MAX_SWEAT_ALLOWANCE_ML.
 *
 * Examples:
 *   (2000, null) -> 2000
 *   (2000, 0)    -> 2000
 *   (2000, 600)  -> 2500  (floor(600/500)*500 = 500 ml)
 *   (2000, 5000) -> 3500  (capped at +1500 ml)
 */
export function activityAdjustedTarget(
  baseTargetMl: number,
  activityExpenditureKcal: number | null,
): number {
  if (activityExpenditureKcal === null) return baseTargetMl;
  if (activityExpenditureKcal <= ACTIVITY_REST_THRESHOLD_KCAL) return baseTargetMl;
  const blocks = Math.floor(activityExpenditureKcal / 500);
  const allowance = Math.min(blocks * SWEAT_ALLOWANCE_PER_500KCAL_ML, MAX_SWEAT_ALLOWANCE_ML);
  return baseTargetMl + allowance;
}

/**
 * Derive the electrolyte context from lab rows. PURE and DETERMINISTIC.
 *
 * Considers only sodium, potassium, magnesium (case-insensitive).
 * Returns:
 *   'unknown'            - none of those biomarkers present (DEGRADE)
 *   'low_electrolytes'   - any of those is below its reference low
 *   'elevated_electrolytes' - any of those is above its reference high (and none low)
 *   'balanced'           - all present ones are within range (or have null bounds)
 */
export function electrolyteContext(
  labs: Array<{ biomarker: string; value: number; low: number | null; high: number | null }>,
): string {
  const relevant = labs.filter((l) => ELECTROLYTE_KEYS.has(l.biomarker.toLowerCase()));
  if (relevant.length === 0) return 'unknown';

  let anyLow = false;
  let anyHigh = false;

  for (const l of relevant) {
    if (l.low !== null && l.value < l.low) anyLow = true;
    if (l.high !== null && l.value > l.high) anyHigh = true;
  }

  if (anyLow) return 'low_electrolytes';
  if (anyHigh) return 'elevated_electrolytes';
  return 'balanced';
}

// ---------------------------------------------------------------------------
// Body water context (not exported as a standalone pure fn; used internally)
// ---------------------------------------------------------------------------

function deriveBodyWaterContext(pct: number | null): string {
  if (pct === null || pct === undefined) return 'unknown';
  if (pct < BODY_WATER_LOW_PCT) return 'low';
  if (pct >= BODY_WATER_HIGH_PCT) return 'high';
  return 'normal';
}

// ---------------------------------------------------------------------------
// Compute and persist
// ---------------------------------------------------------------------------

/**
 * Best-effort: read base target, activity expenditure (always null - Connected is
 * FLAG-OFF), electrolyte labs, and body water; compute the reconciled picture;
 * persist one hydration_reconciliation row. Fail-open on every read and on persist.
 * NEVER throws.
 */
export async function computeAndPersistHydrationReconciliation(
  userId: string,
): Promise<HydrationReconciliation> {
  // Connected activity source is FLAG-OFF: always null, no adjustment.
  const activityExpenditureKcal: number | null = null;

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch (err) {
    safeLog.warn('hydration.reconciliation', 'createAdminClient failed, returning fallback', { userId, err });
    const base = FALLBACK_BASE_ML;
    return {
      baseTargetMl: base,
      activityAdjustedTargetMl: activityAdjustedTarget(base, activityExpenditureKcal),
      electrolyteContext: 'unknown',
      bodyWaterContext: 'unknown',
    };
  }

  // --- Read base target from profiles ---
  let baseTargetMl = FALLBACK_BASE_ML;
  try {
    const { data: profileRow } = await (admin as any)
      .from('profiles')
      .select('body_weight_kg, hydration_target_ml_per_day_custom')
      .eq('id', userId)
      .maybeSingle();
    if (profileRow) {
      const custom = profileRow.hydration_target_ml_per_day_custom;
      if (typeof custom === 'number' && custom > 0) {
        baseTargetMl = Math.round(custom);
      } else if (typeof profileRow.body_weight_kg === 'number' && profileRow.body_weight_kg > 0) {
        baseTargetMl = Math.round(profileRow.body_weight_kg * ML_PER_KG);
      }
    }
  } catch (err) {
    safeLog.warn('hydration.reconciliation', 'profiles read failed, using fallback base', { userId, err });
  }

  // --- Read body water from body_tracker_weight (latest row with non-null value) ---
  let bodyWaterPct: number | null = null;
  try {
    const { data: weightRows } = await (admin as any)
      .from('body_tracker_weight')
      .select('body_water_pct')
      .eq('user_id', userId)
      .not('body_water_pct', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    if (Array.isArray(weightRows) && weightRows.length > 0) {
      const v = weightRows[0].body_water_pct;
      if (typeof v === 'number') bodyWaterPct = v;
    }
  } catch (err) {
    safeLog.warn('hydration.reconciliation', 'body_tracker_weight read failed, bodyWater degrades', { userId, err });
  }

  // --- Read electrolyte labs from lab_biomarkers ---
  let elabRows: Array<{ biomarker: string; value: number; low: number | null; high: number | null }> = [];
  try {
    const { data: labData } = await (admin as any)
      .from('lab_biomarkers')
      .select('name, value, reference_low, reference_high')
      .eq('user_id', userId)
      .order('collection_date', { ascending: false })
      .limit(100);
    if (Array.isArray(labData)) {
      // Keep only most-recent per biomarker name (list is ordered desc by date)
      const seen = new Set<string>();
      for (const row of labData) {
        const key = (row.name as string).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          elabRows.push({
            biomarker: row.name,
            value: row.value,
            low: row.reference_low ?? null,
            high: row.reference_high ?? null,
          });
        }
      }
    }
  } catch (err) {
    safeLog.warn('hydration.reconciliation', 'lab_biomarkers read failed, electrolytes degrade', { userId, err });
  }

  // --- Compute ---
  const adjustedTargetMl = activityAdjustedTarget(baseTargetMl, activityExpenditureKcal);
  const elCtx = electrolyteContext(elabRows);
  const bwCtx = deriveBodyWaterContext(bodyWaterPct);

  // --- Persist (fail-open) ---
  try {
    const { error: insertErr } = await (admin as any)
      .from('hydration_reconciliation')
      .insert({
        user_id: userId,
        base_target_ml: baseTargetMl,
        activity_adjusted_target_ml: adjustedTargetMl,
        electrolyte_context: elCtx,
        body_water_context: bwCtx,
      });
    if (insertErr) {
      safeLog.warn('hydration.reconciliation', 'persist insert failed', { userId, err: insertErr });
    }
  } catch (err) {
    safeLog.warn('hydration.reconciliation', 'persist threw, continuing', { userId, err });
  }

  return {
    baseTargetMl,
    activityAdjustedTargetMl: adjustedTargetMl,
    electrolyteContext: elCtx,
    bodyWaterContext: bwCtx,
  };
}
