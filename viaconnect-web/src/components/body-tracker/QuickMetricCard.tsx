'use client';

import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import type { MetricStatus } from '@/lib/body-tracker/types';

interface QuickMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  status: MetricStatus;
  trend?: 'up' | 'down' | 'stable';
}

const STATUS_STYLES: Record<MetricStatus, { color: string; bg: string; border: string }> = {
  Good:     { color: '#2DA5A0', bg: 'rgba(45,165,160,0.15)', border: 'rgba(45,165,160,0.30)' },
  Standard: { color: 'rgba(255,255,255,0.60)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' },
  High:     { color: '#B75E18', bg: 'rgba(183,94,24,0.15)', border: 'rgba(183,94,24,0.30)' },
  Low:      { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.30)' },
};

export function QuickMetricCard({ icon: Icon, label, value, unit, status, trend }: QuickMetricCardProps) {
  const st = STATUS_STYLES[status];
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-white/50" strokeWidth={1.5} />
        <span className="text-[11px] text-white/50">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white">{value}</span>
        <span className="text-xs text-white/40">{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: st.bg, borderColor: st.border, color: st.color }}
        >
          {status}
        </span>
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-[#EF4444]" strokeWidth={1.5} />}
        {trend === 'stable' && <Minus className="h-3 w-3 text-white/40" strokeWidth={1.5} />}
      </div>
    </div>
  );
}
