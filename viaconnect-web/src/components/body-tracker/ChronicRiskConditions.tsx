'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type {
  TrackedCondition,
  RiskSeverity,
  RiskTrend,
} from '@/lib/body-tracker/chronic-risk-types';

interface ChronicRiskConditionsProps {
  conditions: TrackedCondition[];
}

const SEVERITY_STYLES: Record<RiskSeverity, { label: string; pill: string; bar: string }> = {
  None: {
    label: 'None',
    pill: 'border-white/20 bg-white/5 text-white/80',
    bar: 'bg-white/30',
  },
  Low: {
    label: 'Low',
    pill: 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0]',
    bar: 'bg-[#2DA5A0]',
  },
  Moderate: {
    label: 'Moderate',
    pill: 'border-[#D4A14F]/40 bg-[#D4A14F]/10 text-[#D4A14F]',
    bar: 'bg-[#D4A14F]',
  },
  High: {
    label: 'High',
    pill: 'border-[#B75E18]/40 bg-[#B75E18]/10 text-[#B75E18]',
    bar: 'bg-[#B75E18]',
  },
};

function renderSparkline(trendData: number[] | undefined, severity: RiskSeverity): JSX.Element | null {
  if (!trendData || trendData.length < 2) return null;
  const max = Math.max(...trendData, 1);
  const min = Math.min(...trendData, 0);
  const range = Math.max(max - min, 1);
  const points = trendData.map((v, i) => {
    const x = (i / (trendData.length - 1)) * 60;
    const y = 18 - ((v - min) / range) * 16;
    return `${x},${y}`;
  }).join(' ');
  const stroke =
    severity === 'High' ? '#B75E18'
    : severity === 'Moderate' ? '#D4A14F'
    : severity === 'Low' ? '#2DA5A0'
    : 'rgba(255,255,255,0.4)';
  return (
    <svg viewBox="0 0 60 20" className="h-5 w-16" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

function trendIcon(trend: RiskTrend) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.5} />;
  return <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />;
}

export function ChronicRiskConditions({ conditions }: ChronicRiskConditionsProps) {
  if (conditions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/5 backdrop-blur-md p-5 text-center">
        <p className="text-sm text-white/60">No tracked conditions yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/5 backdrop-blur-md p-5">
      <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide mb-4">
        Tracked Conditions
      </h3>
      <div className="flex flex-col gap-3">
        {conditions.map((c) => {
          const style = SEVERITY_STYLES[c.severity];
          const fillPct = Math.max(0, Math.min(100, c.riskScore));
          return (
            <div
              key={c.name}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/90 font-medium">{c.name}</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.pill}`}>
                  {style.label}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${style.bar}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-white/60 min-w-[60px] justify-end">
                  {trendIcon(c.trend)}
                  <span>{Math.round(c.riskScore)}</span>
                </div>
                {renderSparkline(c.trendData, c.severity)}
              </div>

              {c.indicators && c.indicators.length > 0 ? (
                <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
                  Inputs: {c.indicators.join(', ')}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-white/45 text-center leading-relaxed">
        Each indicator counts inputs from your data; areas to discuss with your healthcare provider.
      </p>
    </div>
  );
}
