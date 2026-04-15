export type ScorePoint = { date: string; score: number };

export type TimeRange = "7D" | "4W" | "3M" | "1Y";

export const RANGE_DAYS: Record<TimeRange, number> = {
  "7D": 7,
  "4W": 28,
  "3M": 90,
  "1Y": 365,
};

export const RANGE_LABEL: Record<TimeRange, string> = {
  "7D": "Daily",
  "4W": "Weekly",
  "3M": "Monthly",
  "1Y": "Yearly",
};

export type Tier = {
  name: string;
  color: string;
  min: number;
};

export const TIERS: Tier[] = [
  { name: "Optimal", color: "#2DA5A0", min: 90 },
  { name: "Thriving", color: "#34D399", min: 75 },
  { name: "Progressing", color: "#F59E0B", min: 55 },
  { name: "Developing", color: "#E8803A", min: 35 },
  { name: "Baseline", color: "#EF4444", min: 0 },
];

export function tierFor(score: number): Tier {
  for (const tier of TIERS) {
    if (score >= tier.min) return tier;
  }
  return TIERS[TIERS.length - 1];
}

export function filterByRange<T extends { date: string }>(points: T[], range: TimeRange): T[] {
  const cutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  return points.filter((p) => new Date(p.date).getTime() >= cutoff);
}

export function movingAverage(points: ScorePoint[], window: number): ScorePoint[] {
  if (points.length === 0) return [];
  return points.map((p, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = points.slice(start, i + 1);
    const avg = slice.reduce((s, x) => s + x.score, 0) / slice.length;
    return { date: p.date, score: avg };
  });
}

export function trendDirection(points: ScorePoint[]): "up" | "down" | "flat" {
  if (points.length < 2) return "flat";
  const first = points.slice(0, Math.ceil(points.length / 3));
  const last = points.slice(-Math.ceil(points.length / 3));
  const fa = first.reduce((s, p) => s + p.score, 0) / first.length;
  const la = last.reduce((s, p) => s + p.score, 0) / last.length;
  const diff = la - fa;
  if (diff > 2) return "up";
  if (diff < -2) return "down";
  return "flat";
}

export function projectTrajectory(points: ScorePoint[], forwardDays: number): ScorePoint[] {
  if (points.length < 3) return [];
  const recent = points.slice(-Math.min(14, points.length));
  const xs = recent.map((_, i) => i);
  const ys = recent.map((p) => p.score);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  const lastIdx = n - 1;
  const lastDate = new Date(recent[recent.length - 1].date);
  const out: ScorePoint[] = [];
  for (let k = 1; k <= forwardDays; k++) {
    const proj = Math.max(0, Math.min(100, slope * (lastIdx + k) + intercept));
    const d = new Date(lastDate);
    d.setDate(d.getDate() + k);
    out.push({ date: d.toISOString().slice(0, 10), score: proj });
  }
  return out;
}

export function personalBest(points: ScorePoint[]): number {
  if (points.length === 0) return 0;
  return Math.round(Math.max(...points.map((p) => p.score)));
}

export function daysActive(points: ScorePoint[]): number {
  const uniq = new Set(points.map((p) => p.date.slice(0, 10)));
  return uniq.size;
}

export function nextMilestone(score: number): { target: number; label: string } {
  if (score < 35) return { target: 35, label: "Developing" };
  if (score < 55) return { target: 55, label: "Progressing" };
  if (score < 75) return { target: 75, label: "Thriving" };
  if (score < 90) return { target: 90, label: "Optimal" };
  return { target: 100, label: "Peak" };
}
