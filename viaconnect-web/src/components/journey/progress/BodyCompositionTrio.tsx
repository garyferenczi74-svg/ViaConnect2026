'use client';

/**
 * src/components/journey/progress/BodyCompositionTrio.tsx
 *
 * Body Composition TRIO for the Your Journey page (Prompt 208g, Task G-T4).
 * Replaces the 2-up BodyCompositionCard + EnergyBalanceTriangle row with a
 * responsive 3-cell grid: Lean Mass | Body Fat | Energy Balance.
 *
 * Sources (each fail-open, honest "--" when null):
 *   - lean mass: snapshot.totalMuscleMassLbs when present; else derived from
 *     the latest weight x (1 - bodyFat/100). Honest "--" when neither available.
 *   - body fat %: snapshot.totalBodyFatPct (real). "--" until logged.
 *   - energy balance: EnergyBalanceTriangle (reused as-is).
 *   - sparklines: useRecentBodySeries weight / bodyFat series.
 *
 * WEIGHT GUARDRAIL (208a) IN FULL: supportive framing ONLY. No aggressive
 * targets, no restriction language, no shaming. A steadily rising body-fat
 * trend surfaces a calm, OPTIONAL practitioner check-in as a resource. This
 * block is carried verbatim from BodyCompositionCard. Never fabricates values.
 *
 * The pure helper deriveLeanMass is exported for the TDD unit test.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans / DM Mono,
 * Lucide strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe. Never
 * throws (fail-open throughout).
 */

import { useMemo } from 'react';
import { Dumbbell, Percent, Info } from 'lucide-react';
import { useLatestComposition } from '@/hooks/body-tracker/useLatestComposition';
import { computeTrend } from '@/lib/labs/trend';
import { Sparkline } from './Sparkline';
import { useRecentBodySeries } from './useRecentBodySeries';
import { EnergyBalanceTriangle } from './EnergyBalanceTriangle';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// ---------------------------------------------------------------------------
// deriveLeanMass -- PURE, EXPORTED for TDD
//
// Prefer the measured total muscle mass in lbs. Fall back to
// latestWeightLbs x (1 - bodyFatPct / 100) when weight > 0 and
// 0 <= bodyFatPct < 100 (both finite). Else null.
//
// Never throws. Deterministic. No side effects.
// ---------------------------------------------------------------------------

export function deriveLeanMass(input: {
  measuredMuscleLbs: number | null;
  latestWeightLbs: number | null;
  bodyFatPct: number | null;
}): number | null {
  const { measuredMuscleLbs, latestWeightLbs, bodyFatPct } = input;

  // Prefer the directly measured value when finite.
  if (typeof measuredMuscleLbs === 'number' && Number.isFinite(measuredMuscleLbs)) {
    return measuredMuscleLbs;
  }

  // Derive from weight + body-fat percentage when all guards pass.
  if (
    typeof latestWeightLbs === 'number' &&
    Number.isFinite(latestWeightLbs) &&
    latestWeightLbs > 0 &&
    typeof bodyFatPct === 'number' &&
    Number.isFinite(bodyFatPct) &&
    bodyFatPct >= 0 &&
    bodyFatPct < 100
  ) {
    return latestWeightLbs * (1 - bodyFatPct / 100);
  }

  return null;
}

// ---------------------------------------------------------------------------
// metric -- 1-decimal value with unit, or honest "--" when null/non-finite.
// ---------------------------------------------------------------------------

function metric(n: number | null, unit: string): string {
  return typeof n === 'number' && Number.isFinite(n)
    ? `${Math.round(n * 10) / 10}${unit}`
    : '--';
}

// ---------------------------------------------------------------------------
// MetricTile -- icon + label + value + Sparkline in a glass tile.
// Each tile is h-full so the three cells in the grid match visually.
// ---------------------------------------------------------------------------

function MetricTile({
  icon: Icon,
  label,
  value,
  points,
  ariaLabel,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
  points: number[];
  ariaLabel: string;
}) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ fontFamily: DM_MONO, color: TEAL }}
        >
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold tabular-nums text-white" style={{ fontFamily: DM_SANS }}>
        {value}
      </span>
      <Sparkline points={points} height={28} ariaLabel={ariaLabel} />
      {value === '--' && (
        <p className="text-[11px] leading-relaxed text-white/50" style={{ fontFamily: DM_SANS }}>
          Log a body scan to track progress.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BodyCompositionTrio
// ---------------------------------------------------------------------------

export function BodyCompositionTrio({ userId }: { userId: string | null }) {
  const { snapshot } = useLatestComposition(userId);
  const { weightLbs, bodyFatPct } = useRecentBodySeries(userId);

  const fatPct = snapshot?.totalBodyFatPct ?? null;

  // Lean mass: prefer the measured total muscle mass; else derive point from
  // the latest weight + body-fat pct. Honest null when neither is known.
  const leanMass = useMemo<number | null>(() => {
    const measured = snapshot?.totalMuscleMassLbs ?? null;
    const latestWeightLbs = weightLbs.length > 0 ? weightLbs[weightLbs.length - 1] : null;
    return deriveLeanMass({
      measuredMuscleLbs: measured,
      latestWeightLbs,
      bodyFatPct: fatPct,
    });
  }, [snapshot, weightLbs, fatPct]);

  // Lean-mass sparkline: use the weight series shape (same trend direction).
  const leanPoints = weightLbs;

  // GUARDRAIL (208a): a notably rising body-fat trend over enough points
  // surfaces a calm, OPTIONAL practitioner check-in as a supportive resource.
  // Requires at least 4 readings and a non-trivial upward slope so day-to-day
  // noise does not trigger it. Never a target, never a prescription.
  const bodyFatRisingNotably = useMemo(() => {
    if (bodyFatPct.length < 4) return false;
    const t = computeTrend(bodyFatPct.map((v, i) => ({ date: String(i), value: v })));
    // Slope is per reading index; ~0.1%/reading upward signals a notable rise.
    return t.direction === 'rising' && t.slope > 0.1;
  }, [bodyFatPct]);

  return (
    <div className="flex flex-col gap-4">
      {/* 3-cell responsive grid: stacks on mobile, 3-across on sm+ */}
      <div className="grid grid-cols-1 gap-3 items-stretch sm:grid-cols-3">
        <MetricTile
          icon={Dumbbell}
          label="Lean mass"
          value={metric(leanMass, ' lb')}
          points={leanPoints}
          ariaLabel="Lean mass trend"
        />
        <MetricTile
          icon={Percent}
          label="Body fat"
          value={metric(fatPct, '%')}
          points={bodyFatPct}
          ariaLabel="Body fat percentage trend"
        />
        {/* Energy balance cell: mount EnergyBalanceTriangle as-is. The tile
            wrapper gives it the same h-full glass treatment as the metric cells. */}
        <div className="h-full">
          <EnergyBalanceTriangle userId={userId} />
        </div>
      </div>

      {/* GUARDRAIL block (208a): calm, optional practitioner check-in when body
          fat is rising notably. Supportive framing only, no targets, no shaming. */}
      {bodyFatRisingNotably && (
        <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
          <p className="text-[12.5px] leading-relaxed text-white/70" style={{ fontFamily: DM_SANS }}>
            Your body composition has been shifting recently. If you would like a hand
            reading it in context, it can help to check in with your practitioner. There is
            no single number to chase here.
          </p>
        </div>
      )}
    </div>
  );
}

export default BodyCompositionTrio;
