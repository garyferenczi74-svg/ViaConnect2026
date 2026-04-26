'use client';

// Prompt #138a Phase 5b: per-variant impression and conversion bar chart.
// Tailwind-only horizontal bars; no chart library, no package.json delta.
// Highlights the leading variant by absolute lift vs control. CAQ-start
// rate per spec section 6.3 is the primary metric; impressions are shown
// alongside as the denominator that drives confidence.

import { Sparkles } from 'lucide-react';

export interface VariantStats {
  slotId: string;
  variantLabel: string;
  isControl: boolean;
  visitors: number;
  caqStarts: number;
}

export interface ImpressionConversionChartProps {
  rows: VariantStats[];
}

export function ImpressionConversionChart({ rows }: ImpressionConversionChartProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 text-center">
        <p className="text-xs text-white/40">No data yet.</p>
      </div>
    );
  }

  const control = rows.find((r) => r.isControl);
  const controlRate = control && control.visitors > 0 ? control.caqStarts / control.visitors : 0;
  const maxVisitors = Math.max(...rows.map((r) => r.visitors), 1);
  const maxRate = Math.max(...rows.map((r) => rate(r)), 0.0001);

  const scored = rows.map((r) => ({
    ...r,
    rate: rate(r),
    liftPP: (rate(r) - controlRate) * 100,
  }));

  const leader = scored
    .filter((r) => !r.isControl && r.visitors > 0)
    .sort((a, b) => b.liftPP - a.liftPP)[0];

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Impressions and CAQ starts</h3>
        {leader && leader.liftPP > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/15 text-[#2DA5A0] text-[10px] px-2 py-0.5 font-medium">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={1.5} />
            Leading: {leader.variantLabel}
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {scored.map((r) => {
          const visitorsPct = (r.visitors / maxVisitors) * 100;
          const ratePct = (r.rate / maxRate) * 100;
          const isLeader = leader?.slotId === r.slotId;
          return (
            <li key={r.slotId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                  {r.variantLabel}
                  {r.isControl && (
                    <span className="text-[10px] uppercase tracking-wider text-white/40">control</span>
                  )}
                </span>
                <span className="text-[11px] text-white/50 font-mono">
                  {r.caqStarts.toLocaleString()} / {r.visitors.toLocaleString()}
                  {' '}
                  ({(r.rate * 100).toFixed(2)}%)
                  {!r.isControl && r.visitors > 0 && controlRate > 0 && (
                    <span className={`ml-2 ${r.liftPP > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {r.liftPP > 0 ? '+' : ''}{r.liftPP.toFixed(2)}pp
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={`h-full ${r.isControl ? 'bg-white/30' : 'bg-white/40'}`}
                    style={{ width: `${visitorsPct}%` }}
                  />
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={`h-full ${
                      isLeader ? 'bg-[#2DA5A0]' : r.isControl ? 'bg-white/40' : 'bg-[#2DA5A0]/50'
                    }`}
                    style={{ width: `${ratePct}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] text-white/40">
        Top bar: visitors. Bottom bar: CAQ-start rate normalized to the leader.
      </p>
    </div>
  );
}

function rate(r: VariantStats): number {
  return r.visitors > 0 ? r.caqStarts / r.visitors : 0;
}
