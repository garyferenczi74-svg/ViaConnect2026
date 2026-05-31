'use client';

// Side-by-side L vs R bar comparison for each paired measurement, with the
// signed left/right delta callout in cm and percent (Prompt #169e Phase 1,
// section 3.2, item 2). This ENHANCES the existing AsymmetryReportCard (it sits
// alongside it on the consumer results surface) and reuses the same tokens.
//
// SIGN CONVENTION (matches asymmetryAnalyzer): positive deltaCm/deltaPct = the
// RIGHT side is larger; negative = the LEFT side is larger. The callout names the
// larger side explicitly so the sign is never ambiguous to the reader.
//
// Informational only, no diagnosis. Neutral Body Scan naming (NOT a FormaVision
// module, which does not exist in this codebase).

import { Scale } from 'lucide-react';
import type { AsymmetryCheck, AsymmetryReport } from '@/lib/arnold/scanning/types';

interface AsymmetryAnalysisPanelProps {
  report: AsymmetryReport;
}

const STATUS_COLOR: Record<string, string> = {
  balanced:              '#22C55E',
  minor_imbalance:       '#EAB308',
  moderate_imbalance:    '#F97316',
  significant_imbalance: '#EF4444',
};

const LEFT_BAR  = '#2DA5A0'; // teal
const RIGHT_BAR = '#6366F1'; // indigo, distinct from the teal left bar

export function AsymmetryAnalysisPanel({ report }: AsymmetryAnalysisPanelProps) {
  const measured = report.checks.filter((c) => c.balanceRatioPct > 0);
  if (measured.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Left vs right comparison</h3>
      </div>

      <ul className="space-y-3">
        {measured.map((c) => (
          <PairRow key={c.name} check={c} />
        ))}
      </ul>

      <p className="text-[10px] text-white/40 leading-snug">
        Bars are scaled to the larger side of each pair. Small differences between sides are normal.
      </p>
    </div>
  );
}

function PairRow({ check }: { check: AsymmetryCheck }) {
  const { name, leftValue, rightValue, unit, deltaCm, deltaPct, status } = check;
  const larger = Math.max(leftValue, rightValue) || 1;
  const leftPct = Math.max(0, Math.min(100, (leftValue / larger) * 100));
  const rightPct = Math.max(0, Math.min(100, (rightValue / larger) * 100));
  const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.balanced;

  return (
    <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-white">{name}</p>
        <span className="text-[11px] font-semibold" style={{ color: statusColor }}>
          {check.balanceRatioPct.toFixed(1)}% balanced
        </span>
      </div>

      {/* Side-by-side bars */}
      <div className="space-y-1.5">
        <Bar side="L" label={`${leftValue} ${unit}`} widthPct={leftPct} color={LEFT_BAR} />
        <Bar side="R" label={`${rightValue} ${unit}`} widthPct={rightPct} color={RIGHT_BAR} />
      </div>

      {/* Signed delta callout (cm + percent), naming the larger side. */}
      <p className="mt-2 text-[11px] leading-snug" style={{ color: statusColor }}>
        {deltaCallout(deltaCm, deltaPct, unit)}
      </p>
    </li>
  );
}

function Bar({
  side, label, widthPct, color,
}: { side: 'L' | 'R'; label: string; widthPct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 shrink-0 text-[10px] font-semibold text-white/55">{side}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${widthPct}%`, backgroundColor: color }}
          aria-hidden
        />
      </div>
      <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-white/65">{label}</span>
    </div>
  );
}

/**
 * Human-readable signed-delta sentence. Positive delta => right larger, negative
 * => left larger, zero => even. Magnitudes are shown unsigned with the side named.
 */
function deltaCallout(deltaCm: number, deltaPct: number, unit: string): string {
  if (deltaCm === 0 && deltaPct === 0) return 'Both sides are even.';
  const side = deltaCm > 0 ? 'Right' : 'Left';
  const absCm = Math.abs(deltaCm).toFixed(1);
  const absPct = Math.abs(deltaPct).toFixed(1);
  return `${side} side larger by ${absCm} ${unit} (${absPct}%).`;
}
