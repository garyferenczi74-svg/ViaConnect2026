// Prompt 201 (2026-06-15): pure helpers for the Progress bento. No engine math
// lives here; these only derive display values from data already on the page.

export type GoalDirection = 'loss' | 'gain';

export interface ProgressToGoal {
  pct: number; // 0..100, clamped
  lbsToGo: number; // >= 0
  direction: GoalDirection;
}

export function computeProgressToGoal(input: {
  startLb: number;
  currentLb: number | null | undefined;
  goalLb: number;
}): ProgressToGoal | null {
  const { startLb, currentLb, goalLb } = input;
  if (currentLb == null || !Number.isFinite(currentLb)) return null;
  const total = goalLb - startLb;
  if (total === 0) return null;
  const direction: GoalDirection = total < 0 ? 'loss' : 'gain';
  const moved = currentLb - startLb;
  const pctRaw = (moved / total) * 100;
  const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));
  const remaining = Math.abs(goalLb - currentLb);
  const reached = direction === 'loss' ? currentLb <= goalLb : currentLb >= goalLb;
  const lbsToGo = reached ? 0 : Math.round(remaining * 10) / 10;
  return { pct, lbsToGo, direction };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Year-aware tick label. isProjectedEndpoint forces a two-digit year suffix so
// the projected completion never reads as an earlier month-day (the Section 8
// axis defect). Input is an ISO YYYY-MM-DD date string.
export function axisTickLabel(isoDate: string, isProjectedEndpoint: boolean): string {
  const [y, m, d] = isoDate.split('-').map((s) => parseInt(s, 10));
  const base = `${MONTHS[(m - 1) % 12]} ${d}`;
  return isProjectedEndpoint ? `${base} '${String(y).slice(-2)}` : base;
}
