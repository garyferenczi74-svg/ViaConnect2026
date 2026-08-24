'use client';

import { Activity, Circle, Droplet, Heart, Info, Moon, PencilLine, Scan, Watch } from 'lucide-react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  CONNECTIONS_BOS_COMPOSITE,
  CONNECTIONS_FOOTER,
  SCORE_DETAIL_DIMENSIONS,
  connectionsBosCompositeDisplay,
  type WearableDimension,
} from '@/lib/body-tracker/wearable-tiles';

const DIM_META: Record<
  string,
  { title: string; Icon: typeof Moon }
> = {
  sleep: { title: 'Sleep', Icon: Moon },
  recovery: { title: 'Recovery', Icon: Heart },
  strain: { title: 'Strain', Icon: Activity },
  metabolic: { title: 'Metabolic', Icon: Droplet },
};

function SourceGlyph({ id }: { id: string | null | undefined }) {
  if (id === 'whoop') return <Watch className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'oura') return <Circle className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'hume') return <Scan className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'apple_health') return <Heart className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'apple_watch') return <Watch className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'manual') return <PencilLine className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  const Dim = DIM_META.metabolic.Icon;
  return <Dim className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
}

function DimIcon({ dimension, activeIcon }: { dimension: string; activeIcon: string | null | undefined }) {
  if (activeIcon) return <SourceGlyph id={activeIcon} />;
  const meta = DIM_META[dimension] ?? DIM_META.metabolic;
  const Icon = meta.Icon;
  return <Icon className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
}

export function lockScoreDetailRows(rows: DimensionSourceRow[]): DimensionSourceRow[] {
  return SCORE_DETAIL_DIMENSIONS.map((dimension) => {
    const found = rows.find((r) => r.dimension === dimension);
    if (found) return found;
    return {
      dimension,
      source: null,
      value: null,
      displayValue: 'UNKNOWN',
      status: 'pending',
      showRing: false,
      manual: false,
      disagreement: null,
      sources: [],
    };
  });
}

function namedWearableContributorCount(rows: DimensionSourceRow[]): number {
  return rows.filter((row) => row.showRing === true && typeof row.source === 'string' && row.source.length > 0).length;
}

interface ScoreDetailPanelProps {
  rows: DimensionSourceRow[];
  lastUpdatedAt: string | null;
}

export function ScoreDetailPanel({ rows }: ScoreDetailPanelProps) {
  const locked = lockScoreDetailRows(rows);
  const named = namedWearableContributorCount(locked);
  const composite =
    named > 0 ? connectionsBosCompositeDisplay() : CONNECTIONS_BOS_COMPOSITE;

  return (
    <section
      aria-labelledby="bos-detail-title"
      data-bos-card="connections"
      className="rounded-[24px] border border-white/[0.08] bg-card p-4 backdrop-blur-md sm:p-5"
    >
      <div className="flex items-center gap-2">
        <h2 id="bos-detail-title" className="text-lg font-bold text-white">
          Bio Optimization Score
        </h2>
        <Info className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} aria-hidden />
      </div>

      <div
        className="mt-5 flex flex-col items-center"
        data-bos-composite={composite.band.toLowerCase()}
      >
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="8"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white/40" aria-label="No score yet">
              {composite.value}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              {composite.band}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {locked.map((row) => {
          const meta = DIM_META[row.dimension] ?? { title: row.dimension, Icon: Droplet };
          const disagree = row.disagreement?.showDisagreeChrome === true;
          const ingest = row.showRing === true;
          const display = ingest ? row.displayValue : 'UNKNOWN';
          return (
            <article
              key={row.dimension}
              data-dimension={row.dimension as WearableDimension}
              data-ingest={ingest ? 'sourced' : 'none'}
              data-ring={ingest ? 'visible' : 'hidden'}
              className="rounded-xl border border-white/[0.08] bg-navy-700/80 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <DimIcon dimension={row.dimension} activeIcon={ingest ? row.disagreement?.activeIcon : null} />
                  <h3 className="text-sm font-semibold text-white whitespace-normal break-words">
                    {meta.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm text-white/55">{display}</span>
                  {ingest && disagree ? (
                    <span className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper ring-1 ring-inset ring-copper/30">
                      DISAGREE
                    </span>
                  ) : null}
                  {ingest && row.manual ? (
                    <span className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper ring-1 ring-inset ring-copper/30">
                      Manual
                    </span>
                  ) : null}
                </div>
              </div>

              {ingest ? (
                <ul className="mt-3 space-y-2">
                  {row.sources.map((src) => {
                    const srcDisplay =
                      src.value === null || !Number.isFinite(src.value) ? 'UNKNOWN' : String(src.value);
                    return (
                      <li
                        key={`${row.dimension}-${src.source}-${src.label ?? ''}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm text-white/80 whitespace-normal break-words">
                          {src.label ?? src.source}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-sm text-white">{srcDisplay}</span>
                          {src.is_active ? (
                            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal ring-1 ring-inset ring-teal/30">
                              Active
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {ingest && row.disagreement?.detail ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-white/50">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {row.disagreement.detail}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-white/40">Missing stays UNKNOWN, never 0.</p>
      <p className="mt-2 text-center text-[11px] text-teal">{CONNECTIONS_FOOTER}</p>
    </section>
  );
}
