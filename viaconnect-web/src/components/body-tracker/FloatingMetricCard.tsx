'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

export type MetricStatus = 'Standard' | 'Good' | 'High' | 'Low' | 'Optimal' | 'Unknown';

const STATUS_COLORS: Record<Exclude<MetricStatus, 'Unknown'>, string> = {
  Standard: '#5B8DEF',
  Good:     '#22C55E',
  Optimal:  '#22C55E',
  High:     '#B75E18',
  Low:      '#5B8DEF',
};

export interface FloatingMetricSubMetric {
  label: string;
  value: string;
  status?: MetricStatus;
}

interface FloatingMetricCardProps {
  label: string;
  value: string;
  status: MetricStatus;
  trend?: 'up' | 'down' | 'stable';
  sparklineData?: number[];
  subMetrics?: FloatingMetricSubMetric[];
  provenance?: string | null;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const stepX = w / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FloatingMetricCard({
  label,
  value,
  status,
  trend,
  sparklineData,
  subMetrics,
  provenance,
}: FloatingMetricCardProps) {
  const isUnknown = status === 'Unknown';
  const color = isUnknown ? null : STATUS_COLORS[status as Exclude<MetricStatus, 'Unknown'>];

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1E3054]/80 p-4 text-center shadow-lg shadow-black/20 backdrop-blur-xl lg:border-white/10 lg:bg-[#1E3054]/55 lg:p-2">
      <p className="flex min-h-[24px] items-center justify-center text-xs uppercase tracking-wider text-white/50 lg:text-[10px]">{label}</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <span className={isUnknown ? 'text-2xl font-bold text-white/40 lg:text-lg' : 'text-2xl font-bold text-white lg:text-lg'}>{value}</span>
        {!isUnknown && trend === 'up' && <TrendingUp size={14} strokeWidth={1.5} className="text-[#2DA5A0]" />}
        {!isUnknown && trend === 'down' && <TrendingDown size={14} strokeWidth={1.5} className="text-[#B75E18]" />}
      </div>
      {!isUnknown && color && (
        <div className="mt-1 flex justify-center">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm"
            style={{ backgroundColor: `${color}1F`, color, border: `1px solid ${color}4D` }}
          >
            {status}
          </span>
        </div>
      )}
      {provenance ? (
        <span
          data-testid="composition-provenance-chip"
          className="mt-1 inline-block rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white/70"
        >
          {provenance}
        </span>
      ) : null}

      {!isUnknown && color && sparklineData && sparklineData.length >= 2 && (
        <Sparkline data={sparklineData} color={color} />
      )}

      {subMetrics && subMetrics.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          {subMetrics.map((sub) => {
            const subColor =
              sub.status && sub.status !== 'Unknown'
                ? STATUS_COLORS[sub.status as Exclude<MetricStatus, 'Unknown'>]
                : 'rgba(255,255,255,0.7)';
            return (
              <div key={sub.label} className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-white/50">{sub.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-white">{sub.value}</span>
                  {sub.status && (
                    <span className="text-[10px]" style={{ color: subColor }}>{sub.status}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
