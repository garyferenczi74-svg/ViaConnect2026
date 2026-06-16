// Prompt 201d (2026-06-15, Gary's "Prompt 200a"): pure mapping helpers for the
// Trajectory Planner goal-mode pills + intensity tiers. NO engine math lives here.
// These only resolve the UI selection into the existing request fields (driver +
// signed/magnitude weekly rate); the server engine computes and clamps targets.
// DD-1 Option A tiers and DD-2 gain tiers, both clamped server-side to
// min(requested, 2 lb/week, 1 percent of current body weight per week).

export type GoalMode = 'maintain' | 'gain' | 'loss';

export interface IntensityTier {
  readonly id: string;
  readonly label: string;
  readonly rate: number; // requested lb per week; the engine clamps after
  readonly hint: string;
}

export const LOSS_TIERS: readonly IntensityTier[] = [
  { id: 'gentle', label: 'Gentle', rate: 0.5, hint: 'about 0.5 lb per week' },
  { id: 'steady', label: 'Steady', rate: 1.0, hint: 'about 1 lb per week' },
  { id: 'max', label: 'Maximum safe', rate: 2.0, hint: 'up to the cap, 2 lb per week or 1 percent of body weight' },
];

export const GAIN_TIERS: readonly IntensityTier[] = [
  { id: 'lean', label: 'Lean', rate: 0.25, hint: 'about 0.25 lb per week' },
  { id: 'standard', label: 'Standard', rate: 0.5, hint: 'about 0.5 lb per week' },
];

const MAINTAIN_BAND_LB = 2.2; // mirrors the engine maintain band (display only)
const MAX_RATE = 2.0;

export function defaultModeForWeights(currentLb: number, goalLb: number): GoalMode {
  if (!Number.isFinite(currentLb) || !Number.isFinite(goalLb) || currentLb <= 0 || goalLb <= 0) {
    return 'maintain';
  }
  const delta = goalLb - currentLb;
  if (Math.abs(delta) <= MAINTAIN_BAND_LB) return 'maintain';
  return delta < 0 ? 'loss' : 'gain';
}

export function tiersForMode(mode: GoalMode): readonly IntensityTier[] {
  return mode === 'loss' ? LOSS_TIERS : mode === 'gain' ? GAIN_TIERS : [];
}

// Reflect a stored goal: map its weekly rate to the nearest tier of the mode.
// Used to populate the dropdown when editing; NOT seeded from the CAQ pace preset.
export function tierForStoredRate(mode: GoalMode, rate: number | null | undefined): string | null {
  const tiers = tiersForMode(mode);
  if (tiers.length === 0 || rate == null || !Number.isFinite(rate)) return null;
  let best = tiers[0];
  let bestDist = Math.abs(Math.abs(rate) - best.rate);
  for (const t of tiers) {
    const d = Math.abs(Math.abs(rate) - t.rate);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best.id;
}

export function defaultTierForMode(mode: GoalMode): string | null {
  if (mode === 'loss') return 'gentle';
  if (mode === 'gain') return 'lean';
  return null;
}

export interface ResolveInput {
  readonly mode: GoalMode;
  readonly tierId: string | null;
  readonly driver: 'rate' | 'date';
  readonly targetDate: string;
}

export interface ResolvedPayload {
  readonly driver: 'rate' | 'date';
  readonly targetRateLbPerWeek: number | null;
  readonly targetDate: string | null;
}

export function resolvePayload(input: ResolveInput): ResolvedPayload {
  if (input.mode === 'maintain') {
    // Rate 0 -> the engine derives a zero deficit -> maintenance calories, even
    // when a goal weight is set. No engine change needed.
    return { driver: 'rate', targetRateLbPerWeek: 0, targetDate: null };
  }
  if (input.driver === 'date') {
    return { driver: 'date', targetRateLbPerWeek: null, targetDate: input.targetDate || null };
  }
  const tiers = tiersForMode(input.mode);
  const tier = tiers.find((t) => t.id === input.tierId) ?? tiers[0];
  return { driver: 'rate', targetRateLbPerWeek: tier.rate, targetDate: null };
}

// Client-side feasibility preview ONLY. The server clamp is authoritative.
export function cappedRate(requested: number, currentLb: number): number {
  if (!Number.isFinite(currentLb) || currentLb <= 0) return Math.min(requested, MAX_RATE);
  return Math.min(requested, MAX_RATE, 0.01 * currentLb);
}
