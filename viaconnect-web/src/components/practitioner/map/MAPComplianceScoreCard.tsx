// Prompt #100 Phase 4: practitioner MAP compliance score card.

import { ShieldCheck } from 'lucide-react';
import type { MAPComplianceScoreRow } from '@/lib/map/types';
import { TIER_TONE } from '@/lib/map/scoring';

export function MAPComplianceScoreCard({
  score,
  trend,
}: {
  score: MAPComplianceScoreRow | null;
  trend: Array<{ calculatedDate: string; score: number }>;
}) {
  if (!score) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5">
        <p className="text-xs text-white/60">
          Your MAP compliance score calculates at 6:30 AM once you have active patient relationships + MAP-eligible SKUs in your storefront.
        </p>
      </section>
    );
  }

  const maxScore = Math.max(100, ...trend.map((t) => t.score));
  const minScore = Math.min(0, ...trend.map((t) => t.score));
  const range = Math.max(1, maxScore - minScore);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
            MAP Compliance
          </span>
        </div>
        <span
          className={`text-[10px] font-semibold rounded-lg px-2 py-0.5 border ${TIER_TONE[score.mapComplianceTier]}`}
        >
          {score.mapComplianceTier}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-white">{score.score}</span>
        <span className="text-xs text-white/55">out of 100</span>
      </div>

      {trend.length > 1 && (
        <div className="flex items-end gap-0.5 h-12">
          {trend.map((t) => {
            const heightPct = ((t.score - minScore) / range) * 100;
            return (
              <div
                key={t.calculatedDate}
                className="flex-1 rounded-sm bg-[#2DA5A0]/50"
                style={{ height: `${Math.max(4, heightPct)}%` }}
                aria-hidden="true"
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 text-[10px]">
        <Stat label="Yellow 90d" value={score.yellowViolations90d} tone="text-amber-300" />
        <Stat label="Orange 90d" value={score.orangeViolations90d} tone="text-orange-300" />
        <Stat label="Red 90d" value={score.redViolations90d} tone="text-red-300" />
        <Stat label="Black 90d" value={score.blackViolations90d} tone="text-red-200" />
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-2">
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
      <p className="text-white/50">{label}</p>
    </div>
  );
}
