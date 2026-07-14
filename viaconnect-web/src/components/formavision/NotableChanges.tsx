'use client';

// Prompt 210b Section 8 (Visual Results): the Notable Changes summary. Shows the
// single biggest change as a kind headline, then an ordered list of per-region
// circumference deltas (already ordered by magnitude by computeCompositionDeltas)
// each with a label, the change in the active unit, and a direction arrow.
//
// Single source of truth: this renders the CompositionDeltasResult from
// computeCompositionDeltas (P3-delta). No recompute, no re-derivation of sign.
// shoulderWidth has direction 'neutral' -> shown with a neutral marker, no
// good/bad arrow. Regions UNKNOWN on either side are already omitted by the
// delta function, so nothing is fabricated here.
//
// Prompt 211b W2: optional noise classifications per circumference row. When a
// row's classification is WITHIN_NOISE, the arrow is replaced with the inline
// WithinNoiseBadge (kind, never failure). MEANINGFUL keeps its arrow. null keeps
// the existing presentation. The classification is a parallel overlay -- the
// underlying numbers are never changed.
//
// Weight-management guardrail (208a): the headline frames progress kindly; a
// reduction is progress, a gain is neutral and curious, never shaming. With no
// deltas (single scan) it shows an inviting empty state.

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type {
  CircumferenceDelta,
  CompositionDeltasResult,
} from '@/lib/formavision/deltas/compositionDeltas';
import type { MeasurementKey } from '@/lib/body-tracker/circumference';
import type { NoiseClassification } from '@/lib/formavision/noise/mdcEngine';
import { WithinNoiseBadge } from './WithinNoiseBadge';

export interface NotableChangesProps {
  deltas: CompositionDeltasResult;
  /**
   * Prompt 211b W2: optional map of MeasurementKey -> noise classification.
   * When provided and a key's value is 'WITHIN_NOISE', that row shows the
   * within-noise badge in place of its directional arrow.
   * Missing entries (undefined) fall through to the existing presentation.
   */
  noiseClassifications?: Partial<Record<MeasurementKey, NoiseClassification | null>>;
  // Task 211b-W4b (SAFETY-CRITICAL): when true, the synthesized headline (which
  // can summarize a body-fat or muscle composition ESTIMATE, e.g. "Your body
  // fat is down...") is replaced with supportive copy. The per-region
  // circumference ROWS below are girth MEASUREMENTS, not composition
  // estimates, and always keep rendering regardless of this flag.
  compositionSuppressed?: boolean;
  // The supportive copy shown in place of the headline when suppressed
  // (getCompositionGating(...).reason). Required when compositionSuppressed is true.
  suppressedCopy?: string | null;
  className?: string;
}

function formatVal(value: number, unit: string): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} ${unit}`;
}

// Arrow + tone from the semantic direction. Never recomputed from sign here.
function directionPresentation(direction: CircumferenceDelta['direction']): {
  Icon: typeof ArrowDown;
  toneClass: string;
} {
  if (direction === 'improved') return { Icon: ArrowDown, toneClass: 'text-[#2DA5A0]' };
  if (direction === 'worsened') return { Icon: ArrowUp, toneClass: 'text-white/80' };
  // unchanged or neutral: no good/bad color, a plain marker.
  return { Icon: Minus, toneClass: 'text-white/50' };
}

// Kind, non-shaming headline for the single biggest change.
function headlineFor(deltas: CompositionDeltasResult): string | null {
  const biggest = deltas.biggest;
  if (!biggest) return null;
  if (biggest.kind === 'bodyFat') {
    const d = biggest.detail;
    if (d.direction === 'improved') return 'Your body fat is down since your first scan. Nice progress.';
    if (d.direction === 'worsened') return 'Your body fat is up a little since your first scan. Keep going.';
    return 'Your body fat is holding steady since your first scan.';
  }
  if (biggest.kind === 'circumference') {
    const d = biggest.detail;
    if (d.direction === 'improved') return `Your biggest change: ${d.label} is down. Nice progress.`;
    if (d.direction === 'worsened') return `Your biggest change is in your ${d.label}. Keep going.`;
    if (d.direction === 'neutral') return `Your biggest change is in your ${d.label}.`;
    return `Your ${d.label} is holding steady.`;
  }
  // muscle
  const d = biggest.detail;
  if (d.direction === 'improved') return `Your biggest change: ${d.label} is up. Strong work.`;
  if (d.direction === 'worsened') return `Your biggest change is in your ${d.label}. Keep going.`;
  return `Your ${d.label} is holding steady.`;
}

export function NotableChanges({
  deltas,
  noiseClassifications,
  compositionSuppressed,
  suppressedCopy,
  className,
}: NotableChangesProps) {
  // Task 211b-W4b (SAFETY-CRITICAL): the synthesized headline can summarize a
  // body-fat or muscle composition ESTIMATE (headlineFor reads deltas.biggest,
  // which may be kind 'bodyFat' or 'muscle'). While suppressed it is replaced
  // wholesale with supportive copy; the circumference rows below (girth
  // measurements) are unaffected and always keep rendering.
  const headline = compositionSuppressed ? null : headlineFor(deltas);
  const rows = deltas.circumferences;

  // Honest empty state: nothing to compare yet (single scan or all UNKNOWN).
  if (!compositionSuppressed && !headline && rows.length === 0) {
    return (
      <div
        data-testid="notable-changes"
        className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm text-center ${className ?? ''}`}
      >
        <p className="text-xs uppercase tracking-wider text-white/40">Notable Changes</p>
        <p data-testid="notable-changes-empty" className="mt-2 text-sm text-white/60">
          Log another scan to see what has changed since your first one.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="notable-changes"
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm ${className ?? ''}`}
    >
      <p className="text-xs uppercase tracking-wider text-white/40">Notable Changes</p>

      {compositionSuppressed && (
        <p
          data-testid="notable-changes-composition-suppressed"
          className="mt-2 text-sm leading-relaxed text-white/70"
        >
          {suppressedCopy ??
            'Composition estimate summaries are paused while pregnancy or lactation mode is active.'}
        </p>
      )}

      {headline && (
        <p data-testid="notable-changes-headline" className="mt-2 text-sm font-medium text-white">
          {headline}
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((row) => {
            const present = directionPresentation(row.direction);
            // Prompt 211b W2: check if this row is classified as WITHIN_NOISE.
            const rowNoise = noiseClassifications?.[row.key];
            const isWithinNoise = rowNoise === 'WITHIN_NOISE';
            return (
              <li
                key={row.key}
                data-testid={`notable-row-${row.key}`}
                data-direction={row.direction}
                data-noise={rowNoise ?? undefined}
                className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-white/80">{row.label}</span>
                <span className="flex flex-col items-start gap-1 sm:items-end">
                  {/* Prompt 211b W2 (review C1): WITHIN_NOISE never gets the toned
                      directional arrow -- it would imply a gain/loss precision the
                      harness has not proven. Value stays visible; badge carries the
                      classification, matching BodyFatReadout's treatment. */}
                  {isWithinNoise ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70">
                      {formatVal(Math.abs(row.delta), row.unit)}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${present.toneClass}`}>
                      <present.Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      {formatVal(Math.abs(row.delta), row.unit)}
                    </span>
                  )}
                  {isWithinNoise && (
                    <WithinNoiseBadge
                      metricLabel={row.label.toLowerCase()}
                      className="mt-0.5"
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-white/35">
        AI derived estimates from your photos and logged data, for wellness tracking, not a medical or diagnostic measurement.
      </p>
    </div>
  );
}
