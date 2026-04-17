'use client';

import { Scale } from 'lucide-react';
import type { AsymmetryReport } from '@/lib/arnold/scanning/types';

interface AsymmetryReportCardProps {
  report: AsymmetryReport;
}

const STATUS_COLOR: Record<string, string> = {
  balanced:                 '#22C55E',
  minor_imbalance:          '#EAB308',
  moderate_imbalance:       '#F97316',
  significant_imbalance:    '#EF4444',
};

export function AsymmetryReportCard({ report }: AsymmetryReportCardProps) {
  if (report.checks.length === 0) return null;
  const overall = report.overallScore;
  const accent =
    overall >= 95 ? '#22C55E' :
    overall >= 90 ? '#EAB308' :
    overall >= 85 ? '#F97316' :
    '#EF4444';

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Symmetry analysis</h3>
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${accent}1F`, color: accent, border: `1px solid ${accent}4D` }}>
          {overall}/100
        </span>
      </div>

      <ul className="space-y-2">
        {report.checks.map((c) => (
          <li key={c.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-white">{c.name}</p>
              <span className="text-[11px] font-semibold" style={{ color: STATUS_COLOR[c.status] }}>
                {c.balanceRatioPct.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/55">
              <span>L {c.leftValue} {c.unit}</span>
              <span>R {c.rightValue} {c.unit}</span>
            </div>
            {c.status !== 'balanced' && (
              <p className="mt-1 text-[11px] text-white/65 leading-snug">{c.recommendation}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
