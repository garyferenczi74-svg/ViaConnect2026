// Prompt #100 Phase 5: admin network health heatmap.
'use client';

import Link from 'next/link';
import type { MAPComplianceScoreRow } from '@/lib/map/types';
import { TIER_TONE } from '@/lib/map/scoring';

export function NetworkHealthHeatmap({ rows }: { rows: MAPComplianceScoreRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
        <p className="text-xs text-white/60">
          No compliance scores calculated yet. Scores populate at 6:30 AM EST daily after the first practitioners have active listings.
        </p>
      </section>
    );
  }

  const sorted = [...rows].sort((a, b) => a.score - b.score);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Network health</h2>
        <p className="text-[11px] text-white/50">{rows.length} practitioners</p>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-14 gap-1.5">
        {sorted.map((r) => {
          const toneClass = toneFor(r.score);
          return (
            <Link
              key={r.scoreId}
              href={`/admin/map/violations?practitioner=${r.practitionerId}`}
              className={`aspect-square rounded-md ${toneClass} flex items-center justify-center text-[9px] font-semibold`}
              title={`${r.mapComplianceTier}: ${r.score}`}
            >
              {r.score}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/60 pt-2 border-t border-white/[0.06]">
        <span>Legend:</span>
        <span className="rounded-md px-1.5 py-0.5 border bg-red-500/15 text-red-300 border-red-500/30">Probation</span>
        <span className="rounded-md px-1.5 py-0.5 border bg-orange-500/15 text-orange-300 border-orange-500/30">Bronze</span>
        <span className="rounded-md px-1.5 py-0.5 border bg-slate-400/15 text-slate-300 border-slate-400/30">Silver</span>
        <span className={`rounded-md px-1.5 py-0.5 border ${TIER_TONE.Gold}`}>Gold</span>
        <span className={`rounded-md px-1.5 py-0.5 border ${TIER_TONE.Platinum}`}>Platinum</span>
      </div>
    </section>
  );
}

function toneFor(score: number): string {
  if (score < 50) return 'bg-red-500/25 text-red-200 border border-red-500/40';
  if (score < 70) return 'bg-orange-500/20 text-orange-200 border border-orange-500/30';
  if (score < 85) return 'bg-slate-400/15 text-slate-200 border border-slate-400/25';
  if (score < 95) return 'bg-amber-500/20 text-amber-100 border border-amber-500/30';
  return 'bg-violet-500/25 text-violet-100 border border-violet-500/40';
}
