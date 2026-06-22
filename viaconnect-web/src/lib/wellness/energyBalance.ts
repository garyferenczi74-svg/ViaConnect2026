// Prompt 208b Task 4.4: energy-balance engine.
//
// A standing energy-balance signal that ties Gordon intake + Arnold composition
// trend + Connected expenditure into one balance_state, persisted to
// energy_balance_signals. Connected activity is FLAG-OFF and usually absent, so
// the engine DEGRADES to 'insufficient_data' and NEVER fabricates an
// expenditure. The pure deriveBalanceState core is the key deliverable;
// computeAndPersistEnergyBalance reads what is cleanly available best-effort,
// is fail-open, and never throws. No em/en-dashes, no emojis.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { computeTrend } from '@/lib/labs/trend';

export type BalanceState = 'deficit' | 'surplus' | 'maintenance' | 'insufficient_data';

export interface EnergyBalanceInputs {
  intakeEstimate: number | null;
  expenditureEstimate: number | null;
  compositionTrend: 'rising' | 'falling' | 'flat' | null;
}

export interface EnergyBalanceResult {
  intakeEstimate: number | null;
  expenditureEstimate: number | null;
  compositionTrend: 'rising' | 'falling' | 'flat' | null;
  balanceState: BalanceState;
}

// Calorie gap (intake - expenditure) that reads as a meaningful deficit/surplus.
// Within +/- this band is maintenance, to avoid over-reading day-to-day noise.
const MEANINGFUL_GAP_KCAL = 100;

// Recent window for both reads. The energy-balance signal is a "recent" standing
// readout, not a single day.
const RECENT_WINDOW_DAYS = 30;

/**
 * Derive the energy-balance state. PURE and DETERMINISTIC.
 *
 * 1. When BOTH intake and expenditure are measured, the calorie gap is the
 *    ground truth: deficit below expenditure by MEANINGFUL_GAP_KCAL, surplus
 *    above by the same margin, else maintenance. A composition trend never
 *    flips a measured gap.
 * 2. When expenditure is null but a composition trend exists, the trend is the
 *    ground truth of net balance over time: falling -> deficit, rising ->
 *    surplus, flat -> maintenance.
 * 3. Otherwise insufficient_data (never fabricate a balance).
 */
export function deriveBalanceState(inp: EnergyBalanceInputs): BalanceState {
  const { intakeEstimate, expenditureEstimate, compositionTrend } = inp;

  if (intakeEstimate != null && expenditureEstimate != null) {
    const gap = intakeEstimate - expenditureEstimate;
    if (gap < -MEANINGFUL_GAP_KCAL) return 'deficit';
    if (gap > MEANINGFUL_GAP_KCAL) return 'surplus';
    return 'maintenance';
  }

  if (expenditureEstimate == null && compositionTrend != null) {
    if (compositionTrend === 'falling') return 'deficit';
    if (compositionTrend === 'rising') return 'surplus';
    return 'maintenance';
  }

  return 'insufficient_data';
}

function recentWindowStartIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - RECENT_WINDOW_DAYS);
  return d.toISOString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Mean recent daily kcal intake from confirmed nutrition_logs. Best-effort:
 * returns null on any error or when there is no usable intake. Daily totals are
 * averaged across the distinct days that have any logged calories.
 */
async function readIntakeEstimate(
  client: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<number | null> {
  try {
    const { data, error } = await (client
      .from('nutrition_logs')
      .select('calories, logged_at')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('logged_at', recentWindowStartIso()) as unknown as Promise<{
      data: Array<{ calories: number | null; logged_at: string | null }> | null;
      error: { message: string } | null;
    }>);

    if (error || !data || data.length === 0) return null;

    const perDay = new Map<string, number>();
    for (const row of data) {
      const kcal = typeof row.calories === 'number' ? row.calories : Number(row.calories);
      if (!Number.isFinite(kcal)) continue;
      if (typeof row.logged_at !== 'string' || row.logged_at.length < 10) continue;
      const key = dayKey(row.logged_at);
      perDay.set(key, (perDay.get(key) ?? 0) + kcal);
    }

    if (perDay.size === 0) return null;
    let sum = 0;
    for (const total of perDay.values()) sum += total;
    return sum / perDay.size;
  } catch (err) {
    safeLog.warn('energyBalance', 'intake read failed - degrading intake to null', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Composition trend over the user's recent weight series via the shared
 * computeTrend least-squares core. Weight is read in pounds (body_tracker_weight
 * stores weight_lbs); trend direction is scale-invariant so the unit is
 * immaterial. Best-effort: returns null on any error or with fewer than 2
 * usable points.
 */
async function readCompositionTrend(
  client: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<'rising' | 'falling' | 'flat' | null> {
  try {
    const { data, error } = await (client
      .from('body_tracker_weight')
      .select('weight_lbs, created_at')
      .eq('user_id', userId)
      .gte('created_at', recentWindowStartIso())
      .order('created_at', { ascending: true }) as unknown as Promise<{
      data: Array<{ weight_lbs: number | null; created_at: string | null }> | null;
      error: { message: string } | null;
    }>);

    if (error || !data) return null;

    const points = data
      .filter(
        (r): r is { weight_lbs: number; created_at: string } =>
          r != null &&
          typeof r.created_at === 'string' &&
          (typeof r.weight_lbs === 'number' || Number.isFinite(Number(r.weight_lbs))),
      )
      .map((r) => ({ date: r.created_at, value: Number(r.weight_lbs) }));

    if (points.length < 2) return null;
    return computeTrend(points).direction;
  } catch (err) {
    safeLog.warn('energyBalance', 'weight-series read failed - degrading trend to null', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Compute the user's recent energy-balance signal and persist one
 * energy_balance_signals row. NEVER throws: every read failure degrades that
 * input to null, the persist is fail-open, and a valid result object is always
 * returned (balanceState degrades to insufficient_data when nothing is known).
 *
 * Connected activity expenditure is FLAG-OFF / absent in the common case. There
 * is no expenditure source wired here, so expenditureEstimate is always null and
 * is NEVER fabricated; the composition trend carries net balance over time.
 */
export async function computeAndPersistEnergyBalance(
  userId: string,
): Promise<EnergyBalanceResult> {
  let intakeEstimate: number | null = null;
  let compositionTrend: 'rising' | 'falling' | 'flat' | null = null;
  // Connected activity is flag-off / absent: no source to read, never invent a
  // number. Left null so the state degrades honestly.
  const expenditureEstimate: number | null = null;

  try {
    const client = createAdminClient();
    intakeEstimate = await readIntakeEstimate(client, userId);
    compositionTrend = await readCompositionTrend(client, userId);

    const balanceState = deriveBalanceState({
      intakeEstimate,
      expenditureEstimate,
      compositionTrend,
    });

    // Persist one row, fail-open: a persist failure does not stop the return.
    try {
      const { error } = await client.from('energy_balance_signals').insert({
        user_id: userId,
        intake_estimate: intakeEstimate,
        expenditure_estimate: expenditureEstimate,
        composition_trend: compositionTrend,
        balance_state: balanceState,
        signal_window: 'recent',
      });
      if (error) {
        safeLog.error('energyBalance', 'Failed to persist energy_balance_signals', {
          userId,
          error: error.message,
        });
      }
    } catch (err) {
      safeLog.error('energyBalance', 'energy_balance_signals insert threw', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { intakeEstimate, expenditureEstimate, compositionTrend, balanceState };
  } catch (err) {
    // Hard failure (e.g. admin client unavailable): degrade everything and still
    // return a valid object. Never throws.
    safeLog.error('energyBalance', 'computeAndPersistEnergyBalance failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      intakeEstimate,
      expenditureEstimate,
      compositionTrend,
      balanceState: deriveBalanceState({ intakeEstimate, expenditureEstimate, compositionTrend }),
    };
  }
}
