// Shared Helix tier display. Matches HelixRewardsSummary so /helix and
// the dashboard card cannot disagree (0 points is Bronze, never Champion).

export type HelixDisplayTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface HelixTierProgress {
  current: HelixDisplayTier;
  next: HelixDisplayTier | null;
  toNext: number;
  progressPct: number;
}

const TIER_THRESHOLDS: { name: HelixDisplayTier; min: number }[] = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 500 },
  { name: 'Gold', min: 2000 },
  { name: 'Platinum', min: 5000 },
  { name: 'Diamond', min: 10000 },
];

/** Map a real point total onto the dashboard tier ladder. Missing points are 0. */
export function helixTierFromPoints(points: number): HelixTierProgress {
  const safe = Number.isFinite(points) && points > 0 ? points : 0;
  let current: HelixDisplayTier = 'Bronze';
  let next: HelixDisplayTier | null = 'Silver';
  let nextMin = 500;
  let currentMin = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (safe >= TIER_THRESHOLDS[i].min) {
      current = TIER_THRESHOLDS[i].name;
      currentMin = TIER_THRESHOLDS[i].min;
      next = TIER_THRESHOLDS[i + 1]?.name ?? null;
      nextMin = TIER_THRESHOLDS[i + 1]?.min ?? TIER_THRESHOLDS[i].min;
    }
  }
  const span = Math.max(1, nextMin - currentMin);
  const progressPct = next ? Math.min(100, Math.round(((safe - currentMin) / span) * 100)) : 100;
  const toNext = next ? Math.max(0, nextMin - safe) : 0;
  return { current, next, toNext, progressPct };
}
