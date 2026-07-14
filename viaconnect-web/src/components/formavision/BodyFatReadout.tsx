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
// Prompt 211b W2: noise classification. When a bodyFatNoise classification is
// supplied and it is WITHIN_NOISE, the delta row is replaced with the honest
// within-noise copy (never a failure state, never hidden). A MEANINGFUL delta
// keeps its arrow. null classification leaves the existing presentation intact.
//
// Weight-management guardrail (208a): a reduction is framed as progress; a gain
// is neutral and curious, never shaming. These are AI-derived estimates, so the
// disclaimer stays visible nearby.

import { ArrowDown, ArrowUp, Minus, Heart } from 'lucide-react';
import type { MetricDelta } from '@/lib/formavision/deltas/compositionDeltas';
import type { NoiseClassification } from '@/lib/formavision/noise/mdcEngine';
import { withinNoiseCopy, WITHIN_NOISE_INLINE_LABEL } from '@/lib/formavision/noise/mdcEngine';
import { WithinNoiseBadge } from './WithinNoiseBadge';

export interface BodyFatReadoutProps {
  // The latest total body fat percent, or null when UNKNOWN. This is the raw
  // latest value from the composition snapshot, shown even when no delta exists.
  latestBodyFatPct: number | null;
  // The body-fat delta vs the first scan, or null when either side is UNKNOWN.
  bodyFat: MetricDelta | null;
  // ISO timestamps of the first and latest scans for the date line.
  firstScanDate: string | null;
  latestScanDate: string | null;
  // Prompt 211b W2: optional noise classification for the body-fat delta.
  // WITHIN_NOISE -> show kind honest copy instead of the arrow row.
  // MEANINGFUL -> keep the existing arrow row (unchanged behavior).
  // null / undefined -> no classification available; existing behavior.
  bodyFatNoise?: NoiseClassification | null;
  // Task 211b-W4b (SAFETY-CRITICAL): when true, the entire body-fat figure and
  // delta are a composition ESTIMATE that must be suppressed (pregnancy mode
  // active per getCompositionGating). The whole card swaps to supportive copy;
  // no body-fat number or delta is rendered. Absent/false -> unchanged behavior.
  compositionSuppressed?: boolean;
  // The supportive copy shown in place of the estimate when suppressed
  // (getCompositionGating(...).reason). Required when compositionSuppressed is true.
  suppressedCopy?: string | null;
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
  bodyFat,
  firstScanDate,
  latestScanDate,
  bodyFatNoise,
  compositionSuppressed,
  suppressedCopy,
  className,
}: BodyFatReadoutProps) {
  const hasLatest = typeof latestBodyFatPct === 'number' && Number.isFinite(latestBodyFatPct);

  // Task 211b-W4b (SAFETY-CRITICAL): pregnancy-mode suppression takes
  // precedence over every other state. No body-fat figure or delta is ever
  // rendered while suppressed, regardless of whether data is present.
  if (compositionSuppressed) {
    return (
      <div
        data-testid="body-fat-readout"
        className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm text-center ${className ?? ''}`}
      >
        <p className="text-xs uppercase tracking-wider text-white/40">Total Body Fat</p>
        <div
          data-testid="body-fat-composition-suppressed"
          className="mt-3 flex flex-col items-center gap-2"
        >
          <Heart className="h-5 w-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-sm leading-relaxed text-white/70">
            {suppressedCopy ??
              'Body composition estimates are paused while pregnancy or lactation mode is active.'}
          </p>
        </div>
      </div>
    );
  }

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
  // Prompt 211b W2: within-noise takes precedence over the arrow row.
  const isWithinNoise = bodyFatNoise === 'WITHIN_NOISE';

  return (
    <div
      data-testid="body-fat-readout"
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="text-center sm:text-left">
          <p className="text-xs uppercase tracking-wider text-white/40">Total Body Fat</p>
          <p data-testid="body-fat-figure" className="mt-1 text-5xl font-bold leading-none text-white">
            {formatPct(latestBodyFatPct as number)}
          </p>
        </div>

        {isWithinNoise && bodyFat ? (
          /* Prompt 211b W2: WITHIN_NOISE -- kind honest copy, never a failure state. */
          <div
            data-testid="body-fat-within-noise"
            className="flex max-w-[240px] flex-col items-center gap-1.5 sm:items-end"
          >
            <WithinNoiseBadge metricLabel="body fat" />
            <span
              data-testid="body-fat-within-noise-copy"
              className="text-center text-[11px] leading-relaxed text-white/55 sm:text-right"
            >
              {withinNoiseCopy({ metricLabel: 'body fat' })}
            </span>
          </div>
        ) : present && bodyFat ? (
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
