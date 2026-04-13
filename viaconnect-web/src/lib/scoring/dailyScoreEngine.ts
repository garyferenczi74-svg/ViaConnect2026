// Daily Score Engine (Prompt #62d).
//
// Multi-source weighted blend. For each gauge we collect inputs from
// connected sources (Tier 1 wearable → Tier 5 CAQ baseline), weight by
// tier × source confidence, then blend the resulting "live" score
// against the consumer's CAQ baseline using the same Bio Optimization
// onboarding curve from Prompt #17 (80/20 → 40/60 over 40 days).

export type GaugeId =
  | 'sleep'
  | 'exercise'
  | 'steps'
  | 'stress'
  | 'recovery'
  | 'streak'
  | 'supplements'
  | 'nutrition';

export type DataSourceTier = 1 | 2 | 3 | 4 | 5;

export interface DataSourceInput {
  tier: DataSourceTier;
  /** Stable identifier, e.g. 'apple_health_sleep', 'myfitnesspal_macros'. */
  sourceId: string;
  /** Original sensor/app value (kept for telemetry; not used in math). */
  rawValue: number;
  /** Source value normalized to 0-100 — see scoreNormalizers.ts. */
  normalizedScore: number;
  /** ISO timestamp of when the input was recorded. */
  timestamp: string;
  /** 0-1 reliability for this specific source/measurement. */
  confidence: number;
}

export interface GaugeScoreConfig {
  gaugeId: GaugeId;
  sources: DataSourceInput[];
  /** CAQ-derived baseline for this gauge (0-100). */
  caqBaseline: number;
  /** Days since the user completed onboarding. */
  daysSinceOnboarding: number;
}

const TIER_WEIGHTS: Record<DataSourceTier, number> = {
  1: 1.0,
  2: 0.85,
  3: 0.8,
  4: 0.6,
  5: 0.3,
};

const clamp = (n: number) => Math.min(100, Math.max(0, n));
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Live-data weight in the CAQ vs live blend. Day 1 → 0.20, Day 40+ → 0.60.
 * Mirrors the Bio Optimization Score curve from Prompt #17.
 */
export function liveDataWeight(daysSinceOnboarding: number): number {
  return Math.min(0.6, 0.2 + (Math.max(0, daysSinceOnboarding) / 40) * 0.4);
}

export function calculateGaugeScore(config: GaugeScoreConfig): number {
  const { sources, caqBaseline, daysSinceOnboarding } = config;

  if (sources.length === 0) return Math.round(clamp(caqBaseline));

  let weightedSum = 0;
  let totalWeight = 0;
  for (const source of sources) {
    const weight = TIER_WEIGHTS[source.tier] * clamp01(source.confidence);
    weightedSum += clamp(source.normalizedScore) * weight;
    totalWeight += weight;
  }

  const liveScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const live = liveDataWeight(daysSinceOnboarding);
  const blended = caqBaseline * (1 - live) + liveScore * live;

  return Math.round(clamp(blended));
}

export function calculateComposite(scores: Record<GaugeId, number>): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
