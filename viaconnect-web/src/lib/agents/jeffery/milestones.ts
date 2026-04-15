/**
 * Jeffery — milestone detector.
 *
 * Scans a chronological series of Bio Optimization scores and reports the
 * points at which the user crossed into a higher tier. Used by the trend
 * chart (gold diamond markers) and, in a future iteration, for writing
 * durable milestone rows.
 */

export type TierName = "Baseline" | "Developing" | "Progressing" | "Thriving" | "Optimal";

export const TIER_FLOORS: Array<{ name: TierName; min: number }> = [
  { name: "Optimal", min: 90 },
  { name: "Thriving", min: 75 },
  { name: "Progressing", min: 55 },
  { name: "Developing", min: 35 },
  { name: "Baseline", min: 0 },
];

export function tierForScore(score: number): TierName {
  for (const t of TIER_FLOORS) {
    if (score >= t.min) return t.name;
  }
  return "Baseline";
}

export type MilestoneCrossing = {
  date: string;
  score: number;
  from: TierName;
  to: TierName;
  direction: "up" | "down";
};

/**
 * Returns the tier crossings in order. Each crossing is the first datapoint
 * that sits in a different tier than its predecessor. Crossings that drop
 * back down are included with direction='down'; the UI can filter to
 * direction='up' only for celebratory markers.
 */
export function detectMilestones(
  points: Array<{ date: string; score: number }>,
): MilestoneCrossing[] {
  if (points.length < 2) return [];

  const out: MilestoneCrossing[] = [];
  let prevTier = tierForScore(points[0].score);

  for (let i = 1; i < points.length; i++) {
    const t = tierForScore(points[i].score);
    if (t !== prevTier) {
      const prevRank = TIER_FLOORS.findIndex((x) => x.name === prevTier);
      const nextRank = TIER_FLOORS.findIndex((x) => x.name === t);
      out.push({
        date: points[i].date,
        score: points[i].score,
        from: prevTier,
        to: t,
        direction: nextRank < prevRank ? "up" : "down",
      });
      prevTier = t;
    }
  }

  return out;
}
