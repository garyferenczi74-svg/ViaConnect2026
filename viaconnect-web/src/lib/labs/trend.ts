// Prompt 208a Module E (E3): biomarker longitudinal trend (slope) analysis.
// Reads a biomarker as a trajectory, not a single point. Pure, deterministic,
// never throws. No em/en-dashes, no emojis.

export interface TrendPoint {
  date: string;
  value: number;
}

export interface BiomarkerTrend {
  direction: 'rising' | 'falling' | 'flat';
  slope: number; // per-day change (least-squares), or 0 when not computable
  trend_window: string;
}

// Slope magnitudes below this (per day) read as flat to avoid over-reading noise.
const FLAT_EPSILON = 1e-6;

function dayOffset(from: number, dateStr: string): number {
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t) || !Number.isFinite(from)) return NaN;
  return (t - from) / 86_400_000;
}

/**
 * Least-squares slope of value over time (per day). Falls back to point index
 * when dates are unparseable. Returns a flat/zero trend for fewer than 2 points.
 */
export function computeTrend(points: TrendPoint[]): BiomarkerTrend {
  const pts = (points ?? []).filter((p) => p && Number.isFinite(p.value));
  if (pts.length < 2) {
    return { direction: 'flat', slope: 0, trend_window: `${pts.length} point` };
  }

  const firstT = new Date(pts[0].date).getTime();
  // Build x values: day offsets when parseable for all, else 0..n-1 index.
  let xs = pts.map((p) => dayOffset(firstT, p.date));
  if (xs.some((x) => !Number.isFinite(x))) {
    xs = pts.map((_, i) => i);
  }
  const ys = pts.map((p) => p.value);

  const n = pts.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const direction: BiomarkerTrend['direction'] =
    Math.abs(slope) < FLAT_EPSILON ? 'flat' : slope > 0 ? 'rising' : 'falling';

  return { direction, slope, trend_window: `${n} points` };
}
