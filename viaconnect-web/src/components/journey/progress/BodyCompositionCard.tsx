'use client';

/**
 * src/components/journey/progress/BodyCompositionCard.tsx
 *
 * The body-composition card for the Your Journey page (Prompt 208d, 3.4,
 * Task D-T3). It shows LEAN MASS and BODY FAT %, each with a small inline-SVG
 * sparkline of the recent trend.
 *
 * Sources (each fail-open, honest "--" when null):
 *   - body fat %: useLatestComposition().snapshot.totalBodyFatPct (real).
 *   - lean mass: snapshot.totalMuscleMassLbs when present; else derived from the
 *     latest weight x (1 - bodyFat/100). Honest "--" when neither is available.
 *   - sparklines: the recent body_tracker_weight / body_fat series. Fewer than
 *     two points render a calm flat baseline (not a fabricated trend).
 *
 * WEIGHT GUARDRAIL (208a) IN FULL: supportive trajectory framing ONLY. There is
 * NO aggressive target, NO restriction language, NO shaming. If the body-fat
 * trend reads as steadily rising, the card surfaces a CALM, optional check-in
 * with a practitioner as a supportive RESOURCE, never a harder target and never
 * a prescription.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans, Lucide
 * strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe. Never throws.
 */

import { useMemo } from 'react';
import { Dumbbell, Percent, Info } from 'lucide-react';
import { useLatestComposition } from '@/hooks/body-tracker/useLatestComposition';
import { computeTrend } from '@/lib/labs/trend';
import { Sparkline } from './Sparkline';
import { useRecentBodySeries } from './useRecentBodySeries';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

/** A 1-decimal value with a unit, or an honest "--" when null/non-finite. */
function metric(n: number | null, unit: string): string {
  return typeof n === 'number' && Number.isFinite(n)
    ? `${Math.round(n * 10) / 10}${unit}`
    : '--';
}

function MetricBlock({
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
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-[rgba(11,17,32,0.45)] p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
        <span className="text-[10px] uppercase tracking-wide text-white/45" style={{ fontFamily: DM_MONO }}>
          {label}
        </span>
      </div>
      <span className="text-xl font-bold tabular-nums text-white" style={{ fontFamily: DM_SANS }}>
        {value}
      </span>
      <Sparkline points={points} height={26} ariaLabel={ariaLabel} />
    </div>
  );
}

export function BodyCompositionCard({ userId }: { userId: string | null }) {
  const { snapshot } = useLatestComposition(userId);
  const { weightLbs, bodyFatPct } = useRecentBodySeries(userId);

  const fatPct = snapshot?.totalBodyFatPct ?? null;

  // Lean mass: prefer the measured total muscle mass; else derive from the
  // latest weight x (1 - bodyFat/100). Honest null when neither is known.
  const leanMass = useMemo<number | null>(() => {
    const measured = snapshot?.totalMuscleMassLbs ?? null;
    if (typeof measured === 'number' && Number.isFinite(measured)) return measured;

    const latestWeight = weightLbs.length > 0 ? weightLbs[weightLbs.length - 1] : null;
    if (
      typeof latestWeight === 'number' &&
      Number.isFinite(latestWeight) &&
      latestWeight > 0 &&
      typeof fatPct === 'number' &&
      Number.isFinite(fatPct) &&
      fatPct >= 0 &&
      fatPct < 100
    ) {
      return latestWeight * (1 - fatPct / 100);
    }
    return null;
  }, [snapshot, weightLbs, fatPct]);

  // A lean-mass sparkline series derived point-by-point only when both a weight
  // and a single body-fat reading exist; otherwise the measured muscle series is
  // unavailable, so we fall back to the weight series shape (honest, same trend
  // direction) rather than inventing per-point lean mass.
  const leanPoints = weightLbs;

  // Concerning-trend check, GUARDRAILED: a clearly rising body-fat trend over
  // enough points surfaces a calm, optional practitioner check-in. We require at
  // least a few points and a non-trivial upward slope so day-to-day noise does
  // not trigger it. This is a supportive RESOURCE line, never a target.
  const bodyFatRisingNotably = useMemo(() => {
    if (bodyFatPct.length < 4) return false;
    const t = computeTrend(bodyFatPct.map((v, i) => ({ date: String(i), value: v })));
    // Slope is per index step here (dates are indices); ~0.1%/reading upward.
    return t.direction === 'rising' && t.slope > 0.1;
  }, [bodyFatPct]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: TEAL }}
          >
            Body composition
          </span>
          <p className="text-[13px] text-white/65" style={{ fontFamily: DM_SANS }}>
            Your lean mass and body fat, read as a trend.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <MetricBlock
          icon={Dumbbell}
          label="Lean mass"
          value={metric(leanMass, ' lb')}
          points={leanPoints}
          ariaLabel="Lean mass trend"
        />
        <MetricBlock
          icon={Percent}
          label="Body fat"
          value={metric(fatPct, '%')}
          points={bodyFatPct}
          ariaLabel="Body fat percentage trend"
        />
      </div>

      {/* Supportive read. A notable upward body-fat trend routes to a calm,
          optional practitioner check-in (a resource), never a harder target. */}
      {bodyFatRisingNotably ? (
        <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-[rgba(11,17,32,0.45)] px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
          <p className="text-[12.5px] leading-relaxed text-white/70" style={{ fontFamily: DM_SANS }}>
            Your body composition has been shifting recently. If you would like a hand
            reading it in context, it can help to check in with your practitioner. There is
            no single number to chase here.
          </p>
        </div>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-white/65" style={{ fontFamily: DM_SANS }}>
          Composition moves slowly, so trends matter more than any single reading. Keep
          logging and this picture fills in over time.
        </p>
      )}
    </div>
  );
}

export default BodyCompositionCard;
