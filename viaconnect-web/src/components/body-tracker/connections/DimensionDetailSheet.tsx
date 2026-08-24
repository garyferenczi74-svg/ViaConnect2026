'use client';

// Prompt 230, Task 8: the dimension detail sheet opened from a contributor
// row's chevron (ContributorColumn.tsx) via ConnectionsSurface's openMetric
// state. For the selected metric this shows (1) the METRIC_EXPLAINER
// sentence -- what the dimension measures and how it is derived -- and
// (2) the per-source breakdown recovered from that metric's
// DimensionSourceRow: each source's label + value, an "Active" pill when
// is_active, the disagreement.detail line, and a "Manual" indicator. This
// is the honest chrome that used to render inline in ScoreDetailPanel
// before Task 7 split it into one source-per-row (git history: e022b70a).
//
// Honesty: never fabricate a source or value. A missing/non-finite source
// value renders UNKNOWN, never a number. "Active" renders only when
// src.is_active === true. A metric with no sourced row (or no row at all)
// shows the explainer plus a neutral "No source connected yet." line --
// never a fake value or source name.

import { useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  CONTRIBUTOR_METRICS,
  METRIC_LABELS,
  matchRowForMetric,
  type ContributorMetric,
} from '@/lib/body-tracker/contributor-rows';
import { SourceGlyph } from './ContributorColumn';

// Placeholder copy pending Marshall's regulatory/claims review -- flagged,
// not final. Each sentence states what the metric measures and how it is
// derived, without overstating precision beyond what the source data
// supports.
export const METRIC_EXPLAINER: Record<ContributorMetric, string> = {
  hrv: 'Heart rate variability (HRV) measures the variation in time between consecutive heartbeats. It is read directly from the connected wearable overnight sensor reading, not estimated.',
  sleep: 'Sleep reflects total sleep duration and sleep stage quality for the prior night. It is read directly from the connected wearable sleep tracking, not estimated.',
  resting_hr: 'Resting heart rate is the lowest sustained heart rate during sleep or rest. It is read directly from the connected wearable sensor data, not estimated.',
  recovery: 'Recovery combines HRV, resting heart rate, and sleep quality into one readiness signal, calculated by the algorithm built into the connected wearable, using raw readings from that device.',
  workouts: 'Workouts shows daily cardiovascular strain, a Whoop-native metric. It is not a logged exercise history.',
  body_composition: 'Body composition covers weight and body-fat percentage, read from a connected scale, body scan, or health record.',
  steps: 'Steps counts daily step volume, read directly from the activity sensor on the connected wearable or phone.',
};

function isContributorMetric(metric: string): metric is ContributorMetric {
  return (CONTRIBUTOR_METRICS as readonly string[]).includes(metric);
}

function sourceValueDisplay(value: number | null): string {
  return value === null || !Number.isFinite(value) ? 'UNKNOWN' : String(value);
}

interface DimensionDetailSheetProps {
  metric: string | null;
  rows: DimensionSourceRow[];
  onClose: () => void;
}

export function DimensionDetailSheet({ metric, rows, onClose }: DimensionDetailSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Split into two effects: focus keys only on metric, so a ConnectionsSurface
  // re-render while the sheet is open (a tiles refetch, a toast) does not
  // yank focus back to the close button out from under the user. The
  // keydown listener still needs the latest onClose, which is a fresh
  // arrow each render, but re-subscribing that listener has no visible
  // side effect the way re-focusing does.
  useEffect(() => {
    if (metric !== null) closeRef.current?.focus();
  }, [metric]);

  useEffect(() => {
    if (metric === null) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [metric, onClose]);

  if (metric === null) return null;

  const known = isContributorMetric(metric);
  const label = known ? METRIC_LABELS[metric] : metric;
  const explainer = known ? METRIC_EXPLAINER[metric] : null;
  const row = known ? matchRowForMetric(metric, rows) : null;
  const sourced = row !== null && row.showRing === true;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dimension-detail-title"
        data-dimension-detail={metric}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-5 text-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="dimension-detail-title" className="text-lg font-semibold text-white">
            {label}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {explainer ? <p className="mt-2 text-sm leading-relaxed text-white/70">{explainer}</p> : null}

        <div className="mt-4 space-y-3">
          {sourced && row ? (
            <>
              <ul className="space-y-2">
                {row.sources.map((src) => (
                  <li
                    key={`${row.dimension}-${src.source}-${src.label ?? ''}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 text-sm text-white/80 whitespace-normal break-words">
                      <SourceGlyph id={src.source} />
                      {src.label ?? src.source}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white">{sourceValueDisplay(src.value)}</span>
                      {src.is_active === true ? (
                        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal ring-1 ring-inset ring-teal/30">
                          Active
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              {row.disagreement?.showDisagreeChrome === true || row.manual ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.disagreement?.showDisagreeChrome === true ? (
                    <span className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper ring-1 ring-inset ring-copper/30">
                      DISAGREE
                    </span>
                  ) : null}
                  {row.manual ? (
                    <span className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper ring-1 ring-inset ring-copper/30">
                      Manual
                    </span>
                  ) : null}
                </div>
              ) : null}

              {row.disagreement?.detail ? (
                <p className="flex items-start gap-1.5 text-xs text-white/50">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                  {row.disagreement.detail}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-white/50">No source connected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DimensionDetailSheet;
