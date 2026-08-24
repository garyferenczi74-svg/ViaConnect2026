'use client';

// Prompt 230, Task 7: the contributor column inside ScoreDetailPanel.
// One row per 7-MetricKey contributor (src/lib/wearables/types.ts
// DEFAULT_PRECEDENCE), driven by buildContributorRows. A cold row (no
// connected source) shows a "Connect your device" CTA, never a fake
// connected pill or a fabricated value. A populated row shows the real
// source glyph and name. Every row ends with a chevron to the Task 8
// DimensionDetailSheet (mounted in ConnectionsSurface), which owns the
// full per-source disagreement breakdown. When two sources disagree, the
// compact DISAGREE chip is a real button wired to the same
// onOpenDimension(metric) call as the chevron -- not a static, unexplained
// alarm with no escape hatch.

import {
  Activity,
  ChevronRight,
  Circle,
  Droplet,
  Dumbbell,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  Moon,
  PencilLine,
  Scan,
  Watch,
} from 'lucide-react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  buildContributorRows,
  matchRowForMetric,
  type ContributorMetric,
  type ContributorRow,
} from '@/lib/body-tracker/contributor-rows';

export const CONTRIBUTOR_DISCLOSURE =
  'Each row shows the connected device data feeding that metric. Nothing here is estimated until a source is linked.';

export const CONNECT_YOUR_DEVICE_COPY = 'Connect your device';

const METRIC_ICON: Record<string, typeof Moon> = {
  hrv: HeartPulse,
  sleep: Moon,
  resting_hr: Gauge,
  recovery: Activity,
  workouts: Dumbbell,
  body_composition: Droplet,
  steps: Footprints,
};

function MetricIcon({ metric }: { metric: string }) {
  const Icon = METRIC_ICON[metric] ?? Droplet;
  return <Icon className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
}

const SOURCE_LABELS: Record<string, string> = {
  whoop: 'Whoop',
  oura: 'Oura',
  hume: 'Hume Body Pod',
  apple_health: 'Apple Health',
  apple_watch: 'Apple Watch',
  manual: 'Manual entry',
  average: 'Averaged sources',
};

function sourceLabel(id: string): string {
  return (
    SOURCE_LABELS[id] ??
    id
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

export function SourceGlyph({ id }: { id: string | null | undefined }) {
  if (id === 'whoop') return <Watch className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'oura') return <Circle className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'hume') return <Scan className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'apple_health') return <Heart className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'apple_watch') return <Watch className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'manual') return <PencilLine className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  return <Droplet className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
}

interface ContributorColumnProps {
  rows: DimensionSourceRow[];
  onOpenDimension: (metric: string) => void;
}

export function ContributorColumn({ rows, onOpenDimension }: ContributorColumnProps) {
  const contributors = buildContributorRows(rows);

  return (
    <div className="mt-5 space-y-3">
      <p className="text-xs leading-relaxed text-white/50">{CONTRIBUTOR_DISCLOSURE}</p>

      <div className="flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
        <span>Metric</span>
        <span>Source</span>
      </div>

      {contributors.map((row: ContributorRow) => {
        const matched = matchRowForMetric(row.metric as ContributorMetric, rows);
        const disagree = row.connectedSource !== null && matched?.disagreement?.showDisagreeChrome === true;
        return (
          <article
            key={row.metric}
            data-metric={row.metric}
            data-ring={row.connectedSource ? 'visible' : 'hidden'}
            className="rounded-xl border border-white/[0.08] bg-navy-700/80 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <MetricIcon metric={row.metric} />
                <h3 className="text-sm font-semibold text-white whitespace-normal break-words">
                  {row.label}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {row.connectedSource ? (
                  <span className="flex items-center gap-1.5">
                    <SourceGlyph id={row.connectedSource} />
                    <span className="text-sm text-white/70 whitespace-normal break-words">
                      {sourceLabel(row.connectedSource)}
                    </span>
                    {disagree ? (
                      <button
                        type="button"
                        onClick={() => onOpenDimension(row.metric)}
                        aria-label={`${row.label} sources disagree, details`}
                        className="flex min-h-[44px] items-center justify-center rounded-full bg-copper/15 px-3 text-[10px] font-semibold uppercase tracking-wide text-copper ring-1 ring-inset ring-copper/30 transition-colors hover:bg-copper/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/50"
                      >
                        DISAGREE
                      </button>
                    ) : null}
                  </span>
                ) : (
                  <span data-connect-cta className="text-sm font-medium text-teal">
                    {CONNECT_YOUR_DEVICE_COPY}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenDimension(row.metric)}
                  aria-label={`${row.label} details`}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default ContributorColumn;
