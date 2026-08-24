'use client';

import { Activity, Circle, Heart, Info, Leaf, Moon, PencilLine, Scan, Watch } from 'lucide-react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import { formatScoreDetailFooter } from '@/lib/body-tracker/wearable-snapshot';

const DIM_ICONS = {
  sleep: Moon,
  recovery: Heart,
  strain: Activity,
  metabolic: Leaf,
} as const;

function SourceGlyph({ id }: { id: string | null | undefined }) {
  if (id === 'whoop') return <Watch className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'oura') return <Circle className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'hume') return <Scan className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'apple_health') return <Heart className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'apple_watch') return <Watch className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  if (id === 'manual') return <PencilLine className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
  const Dim = DIM_ICONS.metabolic;
  return <Dim className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
}

function titleFor(dimension: string): string {
  if (dimension === 'sleep') return 'Sleep';
  if (dimension === 'recovery') return 'Recovery';
  if (dimension === 'strain') return 'Strain';
  return 'Metabolic';
}

function DimIcon({ dimension, activeIcon }: { dimension: string; activeIcon: string | null | undefined }) {
  if (activeIcon) return <SourceGlyph id={activeIcon} />;
  const Icon = DIM_ICONS[dimension as keyof typeof DIM_ICONS] ?? Leaf;
  return <Icon className="h-4 w-4 text-white/70" strokeWidth={1.5} />;
}

interface ScoreDetailPanelProps {
  rows: DimensionSourceRow[];
  lastUpdatedAt: string | null;
}

export function ScoreDetailPanel({ rows, lastUpdatedAt }: ScoreDetailPanelProps) {
  return (
    <section
      aria-labelledby="bos-detail-title"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/70 p-4 sm:p-5"
    >
      <h2 id="bos-detail-title" className="text-lg font-bold text-white">
        Bio Optimization Score detail
      </h2>

      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const disagree = row.disagreement?.showDisagreeChrome === true;
          return (
            <article
              key={row.dimension}
              data-dimension={row.dimension}
              className="rounded-xl border border-white/[0.08] bg-[#1A2744]/80 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <DimIcon dimension={row.dimension} activeIcon={row.disagreement?.activeIcon} />
                  <h3 className="text-sm font-semibold text-white">{titleFor(row.dimension)}</h3>
                  <span className="font-mono text-sm text-white">{row.displayValue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {disagree ? (
                    <span className="rounded-full bg-[#B75E18]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B75E18] ring-1 ring-inset ring-[#B75E18]/30">
                      DISAGREE
                    </span>
                  ) : null}
                  {row.manual ? (
                    <span className="rounded-full bg-[#B75E18]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B75E18] ring-1 ring-inset ring-[#B75E18]/30">
                      Manual
                    </span>
                  ) : null}
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {(row.sources.length
                  ? row.sources
                  : [{ source: 'none', label: 'Pending', value: null, trust: 0 }]
                ).map((src) => {
                  const display =
                    src.value === null || !Number.isFinite(src.value) ? 'Pending' : String(src.value);
                  return (
                    <li
                      key={`${row.dimension}-${src.source}-${src.label ?? ''}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm text-white/80">{src.label ?? src.source}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">{display}</span>
                        {src.is_active ? (
                          <span className="rounded-full bg-[#2DA5A0]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2DA5A0] ring-1 ring-inset ring-[#2DA5A0]/30">
                            Active
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {row.status === 'pending' || row.disagreement?.kind === 'pending' ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-white/50">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  One or more sources pending or unavailable.
                </p>
              ) : row.disagreement?.detail ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-white/50">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {row.disagreement.detail}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-white/40">{formatScoreDetailFooter(lastUpdatedAt)}</p>
    </section>
  );
}
