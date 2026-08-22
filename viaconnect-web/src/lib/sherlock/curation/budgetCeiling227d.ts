/**
 * Prompt 227d G64: load and set Sherlock curation per-cycle ceilings.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type BudgetCeiling = {
  maxClass3PerCycle: number;
  maxClass0FreshnessPerCycle: number;
  maxNegativeSamplesPerCycle: number;
  measuredCycleCount: number;
  measuredAt: string | null;
  setBy: string | null;
  notes: string;
};

const DEFAULTS: BudgetCeiling = {
  maxClass3PerCycle: 5,
  maxClass0FreshnessPerCycle: 3,
  maxNegativeSamplesPerCycle: 5,
  measuredCycleCount: 0,
  measuredAt: null,
  setBy: null,
  notes: 'defaults',
};

export async function loadBudgetCeiling(): Promise<BudgetCeiling> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('curation_budget_ceiling')
    .select(
      'max_class3_per_cycle, max_class0_freshness_per_cycle, max_negative_samples_per_cycle, measured_cycle_count, measured_at, set_by, notes',
    )
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return DEFAULTS;
  return {
    maxClass3PerCycle: Number(data.max_class3_per_cycle ?? 5),
    maxClass0FreshnessPerCycle: Number(
      data.max_class0_freshness_per_cycle ?? 3,
    ),
    maxNegativeSamplesPerCycle: Number(
      data.max_negative_samples_per_cycle ?? 5,
    ),
    measuredCycleCount: Number(data.measured_cycle_count ?? 0),
    measuredAt: data.measured_at ? String(data.measured_at) : null,
    setBy: data.set_by ? String(data.set_by) : null,
    notes: String(data.notes ?? ''),
  };
}

/**
 * Derive standing ceiling from completed cycle budget rows.
 * Headroom 1.5x on observed caps, hard-capped at 20.
 */
export function deriveCeilingFromCycles(
  cycles: Array<{
    budget?: {
      maxClass3?: number;
      maxClass0?: number;
      proposalsSkippedRejected?: number;
    } | null;
    proposals_raised?: Record<string, number> | null;
    negative_results_count?: number | null;
  }>,
): {
  maxClass3: number;
  maxClass0: number;
  maxNegatives: number;
  measured: number;
  note: string;
} {
  const n = cycles.length;
  if (n === 0) {
    return {
      maxClass3: 5,
      maxClass0: 3,
      maxNegatives: 5,
      measured: 0,
      note: 'No completed cycles; keeping defaults',
    };
  }

  let maxClass3Obs = 0;
  let maxClass0Obs = 0;
  let maxNegObs = 0;
  for (const c of cycles) {
    const b = c.budget ?? {};
    maxClass3Obs = Math.max(maxClass3Obs, Number(b.maxClass3 ?? 0));
    maxClass0Obs = Math.max(maxClass0Obs, Number(b.maxClass0 ?? 0));
    maxNegObs = Math.max(
      maxNegObs,
      Number(c.negative_results_count ?? 0),
    );
    const raised3 = Number(c.proposals_raised?.['3'] ?? 0);
    maxClass3Obs = Math.max(maxClass3Obs, raised3);
  }

  const headroom = (v: number, fallback: number) =>
    Math.min(20, Math.max(fallback, Math.ceil(Math.max(v, fallback) * 1.5)));

  return {
    maxClass3: headroom(maxClass3Obs, 5),
    maxClass0: headroom(maxClass0Obs, 3),
    maxNegatives: headroom(maxNegObs, 5),
    measured: n,
    note: `G64 from ${n} completed cycle(s); 1.5x headroom on observed caps`,
  };
}

export async function setBudgetCeiling(args: {
  maxClass3: number;
  maxClass0: number;
  maxNegatives: number;
  measuredCycleCount: number;
  setBy: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from('curation_budget_ceiling').upsert({
    id: 1,
    max_class3_per_cycle: Math.min(20, Math.max(1, args.maxClass3)),
    max_class0_freshness_per_cycle: Math.min(
      20,
      Math.max(0, args.maxClass0),
    ),
    max_negative_samples_per_cycle: Math.min(
      20,
      Math.max(0, args.maxNegatives),
    ),
    measured_cycle_count: args.measuredCycleCount,
    measured_at: new Date().toISOString(),
    set_by: args.setBy,
    notes: args.notes.slice(0, 1000),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
