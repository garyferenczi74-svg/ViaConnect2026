'use client';

import { Info } from 'lucide-react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  CONNECTIONS_BOS_COMPOSITE,
  SCORE_DETAIL_DIMENSIONS,
  connectionsBosCompositeDisplay,
} from '@/lib/body-tracker/wearable-tiles';
import { ContributorColumn } from './ContributorColumn';

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
  onOpenDimension?: (metric: string) => void;
}

export function ScoreDetailPanel({ rows, onOpenDimension }: ScoreDetailPanelProps) {
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

      <ContributorColumn rows={rows} onOpenDimension={onOpenDimension ?? (() => undefined)} />

      <p className="mt-4 text-center text-[11px] text-white/40">Missing stays UNKNOWN, never 0.</p>
    </section>
  );
}
