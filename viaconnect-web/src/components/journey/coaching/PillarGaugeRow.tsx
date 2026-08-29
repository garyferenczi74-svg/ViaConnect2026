'use client';

/**
 * src/components/journey/coaching/PillarGaugeRow.tsx
 *
 * The RIGHT-bottom gauge cluster of the Your Journey coaching header (Prompt
 * 208d, 3.2, Task D-T2). It renders the Bio Optimization hero PlasmaGauge
 * (moved here out of the page placeholder) plus four pillar gauges:
 * Recovery, Sleep, Nutrition, and Movement.
 *
 * Real data: the BOS hero reads useBioOptimizationTrend(userId, '7D').current
 * (latest health score, falling back to the latest daily overall). The four
 * pillars read that same hook's categoryAverages, which are real averages
 * derived from daily_scores:
 *   - Sleep     -> categoryAverages.sleep      (daily_scores.sleep_score avg)
 *   - Nutrition -> categoryAverages.nutrition  (daily_scores.nutrition_score avg)
 *   - Movement  -> categoryAverages.movement   (daily_scores.activity_score avg)
 *   - Recovery  -> categoryAverages.stress     (daily_scores.mood_stress_score avg)
 *
 * Honest fallbacks: a pillar with no data (value 0) shows the gauge at 0 with
 * a "Computing" caption, never a fabricated number. There is no real prior
 * period delta available from this source, so every "vs last" chip renders
 * "--" rather than a fabricated delta. The component never throws.
 *
 * PlasmaGauge is reused UNCHANGED.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans / DM Mono,
 * Lucide icons strokeWidth 1.5, no emojis, no em/en-dashes. PlasmaGauge honors
 * reduced motion internally.
 */

import { Minus, type LucideIcon } from 'lucide-react';
import {
  PlasmaGauge,
  type GaugeMetric,
} from '@/components/gauges/PlasmaGauge';
import { useBioOptimizationTrend } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';
import { useBOSCurrent } from '@/hooks/use-bos-current';
import { BOS_INSUFFICIENT_DATA_COPY, toDisplayBosScore } from '@/lib/scoring/bos-display';

const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

/** Clamp any value into a finite 0..100 gauge score; non-numbers become 0. */
function gaugeScore(v: unknown): number {
  if (typeof v !== 'number' || !isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

type PillarKey = 'recovery' | 'sleep' | 'nutrition' | 'movement';

/**
 * Pillar definitions. `source` names which categoryAverages field feeds each
 * pillar; each maps to a distinct PlasmaGauge metric so the four read apart.
 */
const PILLARS: {
  key: PillarKey;
  label: string;
  metric: GaugeMetric;
  source: 'stress' | 'sleep' | 'nutrition' | 'movement';
}[] = [
  { key: 'recovery', label: 'Recovery', metric: 'wellness', source: 'stress' },
  { key: 'sleep', label: 'Sleep', metric: 'sleep', source: 'sleep' },
  { key: 'nutrition', label: 'Nutrition', metric: 'nutrition', source: 'nutrition' },
  { key: 'movement', label: 'Movement', metric: 'activity', source: 'movement' },
];

/**
 * The "vs last" chip. We have no real prior-period delta from this data
 * source, so we never fabricate one: the chip always renders the honest "--".
 * The signature accepts a nullable delta so a future real source can light it
 * up (positive = teal, negative = orange) without touching call sites.
 */
function DeltaChip({ delta }: { delta: number | null }) {
  const known = typeof delta === 'number' && isFinite(delta);
  const positive = known && delta! >= 0;
  const color = !known
    ? 'rgba(255,255,255,0.40)'
    : positive
      ? '#2DA5A0'
      : '#B75E18';
  const label = !known
    ? '-- vs last'
    : `${positive ? '+' : ''}${delta} vs last`;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style={{
        fontFamily: DM_MONO,
        color,
        background: 'rgba(11,17,32,0.55)',
        border: `1px solid ${color}33`,
      }}
    >
      {!known && (
        <Minus className="h-2.5 w-2.5" strokeWidth={1.5} style={{ color }} />
      )}
      {label}
    </span>
  );
}

function PillarGauge({
  label,
  metric,
  value,
}: {
  label: string;
  metric: GaugeMetric;
  value: number;
  icon?: LucideIcon;
}) {
  const has = value > 0;
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.45)] px-2 py-3">
      <PlasmaGauge
        value={value}
        metric={metric}
        variant="compact"
        size={84}
        max={100}
        caption={has ? label.toUpperCase() : 'COMPUTING'}
        ariaLabel={
          has ? `${label} ${value} of 100` : `${label} score is computing`
        }
      />
      <DeltaChip delta={null} />
    </div>
  );
}

export function PillarGaugeRow({ userId }: { userId: string | null }) {
  // Fail-open: gated on userId; returns current 0 and zeroed averages when
  // there is no data. "7D" matches the trend panel default.
  const { data, isLoading } = useBioOptimizationTrend(userId, '7D');
  const { data: bosCurrent, isLoading: bosCurrentLoading } = useBOSCurrent();

  const bos = toDisplayBosScore(bosCurrent?.score);
  const hasBos = bos !== null;
  const averages = data?.categoryAverages;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      {/* BOS hero (moved here from the page placeholder). */}
      <div className="flex flex-col items-center">
        {hasBos ? (
          <PlasmaGauge
            value={bos}
            metric="bioscore"
            variant="hero"
            size={200}
            max={100}
            ariaLabel={`Bio Optimization Score ${bos} of 100`}
          />
        ) : (
          <div
            className="flex h-[188px] w-[188px] items-center justify-center text-center text-[13px] text-white/50"
            style={{ fontFamily: DM_SANS }}
            aria-label={`Bio Optimization Score: ${BOS_INSUFFICIENT_DATA_COPY}`}
          >
            {BOS_INSUFFICIENT_DATA_COPY}
          </div>
        )}
        <span
          className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/70"
          style={{ fontFamily: DM_MONO }}
        >
          Bio Optimization Score
        </span>
        <span
          className="mt-0.5 text-[11px] text-white/45"
          style={{ fontFamily: DM_SANS }}
        >
          {hasBos
            ? 'Your current Bio Optimization Score'
            : bosCurrentLoading || isLoading
              ? 'Reading your score'
              : BOS_INSUFFICIENT_DATA_COPY}
        </span>
      </div>

      {/* Four pillar gauges: wrap to 2 columns on mobile, 4 across at sm+. */}
      <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PILLARS.map((p) => (
          <PillarGauge
            key={p.key}
            label={p.label}
            metric={p.metric}
            value={gaugeScore(averages?.[p.source])}
          />
        ))}
      </div>
    </div>
  );
}

export default PillarGaugeRow;
