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
  Droplet,
  Dumbbell,
  Footprints,
  Gauge,
  HeartPulse,
  Moon,
  PencilLine,
  Watch,
} from 'lucide-react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  buildContributorRows,
  matchRowForMetric,
  type ContributorMetric,
  type ContributorRow,
} from '@/lib/body-tracker/contributor-rows';
import { CONNECTIONS_DISCLOSURE } from '@/lib/body-tracker/wearable-tiles';
import { WearableBrandMark } from '@/components/body-tracker/connections/WearableBrandMark';

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
  clair: 'Clair Health',
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

// Vendor tile ids (whoop, oura, hume, apple_health, google_health, garmin,
// clair) render through the Lex-gated WearableBrandMark, same as the wearable
// tile card and detail panel. apple_watch (a per-metric source distinct from
// the apple_health file-import tile) and manual each keep their own dedicated
// Lucide glyph below, unchanged. average, and any other id, are not
// wearable vendor marks needing Lex clearance -- they fall through to the
// generic Droplet default at the bottom, same as an unrecognized id.
export function SourceGlyph({ id }: { id: string | null | undefined }) {
  if (
    id === 'whoop' ||
    id === 'oura' ||
    id === 'hume' ||
    id === 'apple_health' ||
    id === 'google_health' ||
    id === 'garmin' ||
    id === 'clair'
  ) {
    return <WearableBrandMark id={id} className="h-4 w-4" />;
  }
  if (id === 'apple_watch') return <Watch className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'manual') return <PencilLine className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  return <Droplet className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
}

interface ContributorColumnProps {
  rows: DimensionSourceRow[];
  onOpenDimension: (metric: string) => void;
}

export const CONTRIBUTOR_ROW_CLASS =
  'flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5';

export function ContributorColumn({ rows, onOpenDimension }: ContributorColumnProps) {
  const contributors = buildContributorRows(rows);

  return (
    <div>
      <p className="mt-3 text-[11px] leading-snug text-white/45">{CONNECTIONS_DISCLOSURE}</p>

      <div className="mt-1 space-y-0.5">
        {contributors.map((row: ContributorRow) => {
          const matched = matchRowForMetric(row.metric as ContributorMetric, rows);
          const disagree =
            row.connectedSource !== null && matched?.disagreement?.showDisagreeChrome === true;
          return (
            <article
              key={row.metric}
              data-metric={row.metric}
              data-ring={row.connectedSource ? 'visible' : 'hidden'}
              className={CONTRIBUTOR_ROW_CLASS}
            >
              <div className="flex min-w-0 items-center gap-2">
                <MetricIcon metric={row.metric} />
                <h3 className="text-sm font-semibold text-white whitespace-nowrap">{row.label}</h3>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {row.connectedSource ? (
                  <span className="flex items-center gap-1.5">
                    <SourceGlyph id={row.connectedSource} />
                    <span className="text-sm text-white/70 whitespace-nowrap">
                      {sourceLabel(row.connectedSource)}
                    </span>
                    {disagree ? (
                      <button
                        type="button"
                        onClick={() => onOpenDimension(row.metric)}
                        aria-label={`${row.label} sources disagree, details`}
                        className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper ring-1 ring-inset ring-copper/30 transition-colors hover:bg-copper/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/50"
                      >
                        DISAGREE
                      </button>
                    ) : null}
                  </span>
                ) : (
                  <span data-connect-cta className="text-sm font-medium text-teal whitespace-nowrap">
                    {CONNECT_YOUR_DEVICE_COPY}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenDimension(row.metric)}
                  aria-label={`${row.label} details`}
                  className="shrink-0 text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default ContributorColumn;
