// Prompt 179: time-aware EWMA over a weight series. No smoother existed in the
// codebase before this. Irregular sampling is handled by deriving a per-step
// alpha from the gap, so a `halfLifeDays` half-life means a sample that many
// days later carries ~0.5 weight. Powers the trajectory chart and the
// recalibration weight-change term.

export interface WeightPoint { date: string; weightLb: number; }
export interface SmoothedPoint { date: string; rawLb: number; smoothedLb: number; }

const DAY_MS = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

function toMs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}
function daysBetween(a: string, b: string): number {
  return Math.max(0, (toMs(b) - toMs(a)) / DAY_MS);
}

export function ewmaSeries(points: WeightPoint[], halfLifeDays = 10): SmoothedPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((p, q) => toMs(p.date) - toMs(q.date));
  const out: SmoothedPoint[] = [];
  let prevSmoothed = sorted[0].weightLb;
  let prevDate = sorted[0].date;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i === 0) {
      prevSmoothed = p.weightLb;
    } else {
      const dt = daysBetween(prevDate, p.date);
      const alpha = 1 - Math.pow(0.5, dt / halfLifeDays);
      prevSmoothed = alpha * p.weightLb + (1 - alpha) * prevSmoothed;
    }
    prevDate = p.date;
    out.push({ date: p.date, rawLb: p.weightLb, smoothedLb: round1(prevSmoothed) });
  }
  return out;
}

// Last smoothed value at or before a target date.
function smoothedAt(series: SmoothedPoint[], date: string): number | null {
  let val: number | null = null;
  for (const s of series) {
    if (toMs(s.date) <= toMs(date)) val = s.smoothedLb;
    else break;
  }
  return val;
}

export function smoothedWeightChange(
  points: WeightPoint[],
  windowStart: string,
  windowEnd: string,
  halfLifeDays = 10,
): number | null {
  const series = ewmaSeries(points, halfLifeDays);
  if (series.length === 0) return null;
  const startVal = smoothedAt(series, windowStart) ?? series[0].smoothedLb;
  const endVal = smoothedAt(series, windowEnd);
  if (endVal === null) return null;
  return round1(endVal - startVal);
}
