'use client';

/**
 * src/components/journey/coaching/GaugeCluster.tsx
 *
 * Hero gauge cluster for the Your Journey coaching layout (Prompt 208g Task G-T2).
 *
 * Renders SEVEN square Plasma Core gauges, one per pillar, each tinted via the
 * PlasmaGauge metric prop. Fills the hero main column width with a responsive
 * grid (3 across on mobile, 4 on sm, 7 on lg desktop). No per-gauge delta badge.
 *
 * Honest baseline: a value of 0 shows the gauge at 0 with a COMPUTING caption.
 * Never fabricates a number. Fail-open: missing data resolves to value 0.
 *
 * PlasmaGauge is reused UNCHANGED. Tint is applied ONLY via the metric prop.
 *
 * Pillars in order:
 *   1. Sleep Quality     averages.sleep      metric 'sleep'
 *   2. Energy Level      averages.adherence  metric 'energy'   (adherence = energy_score avg)
 *   3. Mood and Stress   averages.stress     metric 'mood'
 *   4. Nutrition         averages.nutrition  metric 'nutrition'
 *   5. Physical Activity averages.movement   metric 'activity'
 *   6. Bio Optimization  current (composite) metric 'wellness'
 *   7. Hydration         hydrationPct        metric 'plasmateal'
 *
 * NOTE for Gary: 208g section 4 refers to this pillar as "Overall Wellness" but
 * 208g section 2 specifies the score name is always "Bio Optimization". The label
 * used here is "Bio Optimization" per the explicit task brief decision. Verify
 * on localhost that this label aligns with Gary expectations.
 *
 * Style: glass tiles over Deep Navy, DM Sans labels, DM Mono captions,
 * Lucide strokeWidth 1.5 if any icon (none needed here), no emojis,
 * no em/en-dashes anywhere.
 */

import {
  PlasmaGauge,
  type GaugeMetric,
} from '@/components/gauges/PlasmaGauge';
import { useBioOptimizationTrend } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { useBOSCurrent } from '@/hooks/use-bos-current';
import { BOS_INSUFFICIENT_DATA_COPY, toDisplayBosScore } from '@/lib/scoring/bos-display';

// ---------------------------------------------------------------------------
// Tokens (mirror PillarGaugeRow)
// ---------------------------------------------------------------------------

const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// ---------------------------------------------------------------------------
// gaugeScore: clamp any value into a finite 0..100 integer (mirror PillarGaugeRow)
// ---------------------------------------------------------------------------

/** Clamp any value into a finite 0..100 gauge score; non-numbers become 0. */
function gaugeScore(v: unknown): number {
  if (typeof v !== 'number' || !isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ---------------------------------------------------------------------------
// Pillar spec type
// ---------------------------------------------------------------------------

export interface GaugeSpec {
  label: string;
  metric: GaugeMetric;
  value: number;
}

// ---------------------------------------------------------------------------
// buildGaugeData: pure, deterministic, never throws
//
// Exported for unit testing (gaugeCluster.test.ts). The component calls this
// to derive the 7 specs from the raw hook output.
// ---------------------------------------------------------------------------

export function buildGaugeData(input: {
  current?: number;
  averages?: {
    sleep?: number;
    nutrition?: number;
    movement?: number;
    stress?: number;
    adherence?: number;
  } | null;
  hydrationPct?: number | null;
}): GaugeSpec[] {
  const a = input.averages ?? {};
  return [
    {
      label: 'Sleep Quality',
      metric: 'sleep',
      value: gaugeScore(a.sleep),
    },
    {
      label: 'Energy Level',
      metric: 'energy',
      value: gaugeScore(a.adherence),
    },
    {
      label: 'Mood and Stress',
      metric: 'mood',
      value: gaugeScore(a.stress),
    },
    {
      label: 'Nutrition',
      metric: 'nutrition',
      value: gaugeScore(a.nutrition),
    },
    {
      label: 'Physical Activity',
      metric: 'activity',
      value: gaugeScore(a.movement),
    },
    {
      label: 'Bio Optimization',
      metric: 'wellness',
      value: gaugeScore(input.current),
    },
    {
      label: 'Hydration',
      metric: 'plasmateal',
      value: gaugeScore(input.hydrationPct),
    },
  ];
}

// ---------------------------------------------------------------------------
// GaugeCluster: the rendered component
// ---------------------------------------------------------------------------

export function GaugeCluster({ userId }: { userId: string | null }) {
  // Fail-open: missing data -> value 0 -> computing state. Never throws.
  const { data: bosData } = useBioOptimizationTrend(userId, '7D');
  const { data: hydrationData } = useHydrationToday();
  const { data: bosCurrent } = useBOSCurrent();
  const bosScore = toDisplayBosScore(bosCurrent?.score);

  const specs = buildGaugeData({
    current: bosScore ?? undefined,
    averages: bosData?.categoryAverages ?? null,
    hydrationPct: hydrationData?.percentage_of_target ?? null,
  });

  // Mobile: horizontal scroll row so gauges never shrink below 92px.
  // Desktop (lg+): single row of 7, no overflow needed.
  return (
    <div className="overflow-x-auto pb-1 lg:overflow-x-visible">
      <div className="flex gap-2.5 lg:grid lg:grid-cols-7" style={{ minWidth: 'max-content' }} aria-label="Pillar score gauges">
        {specs.map((spec) => {
          const isBos = spec.label === 'Bio Optimization';
          const has = isBos ? bosScore !== null : spec.value > 0;
          return (
            <div
              key={spec.label}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#16203A] px-2 py-3 lg:shrink"
            >
              {isBos && bosScore === null ? (
                <div
                  className="flex h-[92px] w-[92px] items-center justify-center px-1 text-center text-[9px] leading-tight text-white/50"
                  aria-label={`Bio Optimization Score: ${BOS_INSUFFICIENT_DATA_COPY}`}
                >
                  {BOS_INSUFFICIENT_DATA_COPY}
                </div>
              ) : (
              <PlasmaGauge
                value={isBos && bosScore !== null ? bosScore : spec.value}
                metric={spec.metric}
                variant="standard"
                size={92}
                max={100}
                caption={has ? spec.label.toUpperCase() : 'COMPUTING'}
                ariaLabel={
                  has
                    ? `${spec.label} ${isBos ? bosScore : spec.value} of 100`
                    : `${spec.label} score is computing`
                }
              />
              )}
              <span
                className="text-center text-[10px] font-medium leading-tight text-white/60"
                style={{ fontFamily: DM_SANS }}
              >
                {spec.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GaugeCluster;
