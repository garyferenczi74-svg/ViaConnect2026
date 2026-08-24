'use client';

// Prompt 210b Section 8 (Visual Results): the large body-fat readout at the
// base of the avatar. Shows the latest total body fat percent as a large figure
// plus the change versus the FIRST scan, with both scan dates.
//
// Single source of truth: this renders a MetricDelta produced by
// computeCompositionDeltas (P3-delta) from the two history hooks. It does NOT
// re-derive sign meaning: the arrow + framing come straight from the delta's
// semantic `direction`. UNKNOWN (no first, no latest, or null fat) shows the
// latest value alone or an honest invite, never a fabricated delta, never 0.
//
// Weight-management guardrail (208a): a reduction is framed as progress; a gain
// is neutral and curious, never shaming. These are AI-derived estimates, so the
// disclaimer stays visible nearby.

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { MetricDelta } from '@/lib/formavision/deltas/compositionDeltas';

export interface BodyFatReadoutProps {
  // The latest total body fat percent, or null when UNKNOWN. This is the raw
  // latest value from the composition snapshot, shown even when no delta exists.
  latestBodyFatPct: number | null;
  /** Photo-scan range. When present, the figure shows est. min–max instead of a single midpoint. */
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  // The body-fat delta vs the first scan, or null when either side is UNKNOWN.
  bodyFat: MetricDelta | null;
  // ISO timestamps of the first and latest scans for the date line.
  firstScanDate: string | null;
  latestScanDate: string | null;
  className?: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

// Map the semantic direction to an arrow + tone. We never recompute sign here.
// improved: progress (teal, down arrow for a fat reduction).
// worsened: neutral and curious framing (white, up arrow), never shaming.
// unchanged: steady (white, minus).
function deltaPresentation(direction: MetricDelta['direction']): {
  Icon: typeof ArrowDown;
  toneClass: string;
  label: string;
} {
  if (direction === 'improved') {
    return { Icon: ArrowDown, toneClass: 'text-[#2DA5A0]', label: 'Progress since your first scan' };
  }
  if (direction === 'worsened') {
    return { Icon: ArrowUp, toneClass: 'text-white/80', label: 'Up since your first scan' };
  }
  // unchanged or neutral
  return { Icon: Minus, toneClass: 'text-white/60', label: 'Steady since your first scan' };
}

export function BodyFatReadout({
  latestBodyFatPct,
  estimatedBodyFatMin,
  estimatedBodyFatMax,
  bodyFat,
  firstScanDate,
  latestScanDate,
  className,
}: BodyFatReadoutProps) {
  const hasRange =
    typeof estimatedBodyFatMin === 'number' &&
    typeof estimatedBodyFatMax === 'number' &&
    Number.isFinite(estimatedBodyFatMin) &&
    Number.isFinite(estimatedBodyFatMax);
  const hasLatest =
    hasRange || (typeof latestBodyFatPct === 'number' && Number.isFinite(latestBodyFatPct));

  // Honest empty state: no latest body fat at all.
  if (!hasLatest) {
    return (
      <div
        data-testid="body-fat-readout"
        className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm text-center ${className ?? ''}`}
      >
        <p className="text-xs uppercase tracking-wider text-white/40">Total Body Fat</p>
        <p data-testid="body-fat-empty" className="mt-2 text-sm text-white/60">
          Scan or log your body composition to see your body fat estimate.
        </p>
      </div>
    );
  }

  const present = bodyFat ? deltaPresentation(bodyFat.direction) : null;

  return (
    <div
      data-testid="body-fat-readout"
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="text-center sm:text-left">
          <p className="text-xs uppercase tracking-wider text-white/40">Total Body Fat</p>
          <p data-testid="body-fat-figure" className="mt-1 text-5xl font-bold leading-none text-white">
            {hasRange
              ? `${formatPct(estimatedBodyFatMin as number).replace('%', '')}–${formatPct(estimatedBodyFatMax as number)}`
              : formatPct(latestBodyFatPct as number)}
          </p>
          {hasRange && (
            <p data-testid="body-fat-estimated" className="mt-1 text-[11px] text-white/50">
              Estimated range
            </p>
          )}
        </div>

        {present && bodyFat ? (
          <div className="flex flex-col items-center sm:items-end">
            <span
              data-testid="body-fat-delta"
              className={`inline-flex items-center gap-1 text-lg font-semibold ${present.toneClass}`}
            >
              <present.Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              {formatPct(Math.abs(bodyFat.delta))}
            </span>
            <span className="mt-0.5 text-xs text-white/50">{present.label}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center sm:items-end">
            <span data-testid="body-fat-no-delta" className="text-xs text-white/50">
              Log another scan to see your change.
            </span>
          </div>
        )}
      </div>

      {(firstScanDate || latestScanDate) && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/40 sm:justify-start">
          {firstScanDate && <span>First scan {formatDate(firstScanDate)}</span>}
          {firstScanDate && latestScanDate && <span aria-hidden="true">to</span>}
          {latestScanDate && <span>Latest {formatDate(latestScanDate)}</span>}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-white/35">
        AI derived estimate from your photos and logged data, for wellness tracking, not a medical or diagnostic measurement.
      </p>
    </div>
  );
}
