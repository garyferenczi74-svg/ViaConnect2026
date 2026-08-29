'use client';

// Prompt 182 (2026-06-09): the per metric score tile that fronts the
// 6 gauge grid on the Daily Scores screen. The flat open arc SVG is
// replaced with a shared PlasmaGauge in standard variant. The card
// chrome (border, background, top accent bloom, label row, mode chip)
// is preserved exactly so the grid reads the same on the Dashboard.

import { ClipboardList, Watch, Merge, type LucideIcon } from 'lucide-react';
import type { DataMode } from '@/lib/scoring/dailyScoreEngineV2';
import { PlasmaGauge, type PlasmaMetric } from '@/components/gauges/PlasmaGauge';

interface DailyScoreGaugeProps {
  score: number;
  label: string;
  // The legacy color prop is retained for the accent bloom + label tint
  // so existing call sites do not move; the gauge body now derives its
  // accent from the metric token instead.
  color: string;
  confidence: number;
  dataMode: DataMode;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  animate?: boolean;
  isPreview?: boolean;
  // Prompt 182: which PlasmaGauge palette to use. Daily Scores passes
  // one per row from DailyScoresPanel.
  metric?: PlasmaMetric;
}

const MODE_ICONS: Record<DataMode, LucideIcon> = {
  manual: ClipboardList,
  wearable: Watch,
  combined: Merge,
};

export function DailyScoreGauge({
  score,
  label,
  color,
  confidence,
  dataMode,
  icon: GaugeIcon,
  size = 'md',
  animate = true,
  isPreview = false,
  metric = 'wellness',
}: DailyScoreGaugeProps) {
  const sz = size === 'sm' ? 100 : 120;
  const ModeIcon = MODE_ICONS[dataMode];
  const noData = confidence === 0;

  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 to-[#141E33]/60 backdrop-blur-md p-3.5 transition-all hover:border-white/20">
      <div
        className="pointer-events-none absolute -top-6 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: noData ? 'transparent' : color }}
      />

      <div className="relative" style={{ width: sz, height: sz }}>
        {noData ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg text-white/20">--</span>
          </div>
        ) : (
          <PlasmaGauge
            value={score}
            metric={metric}
            variant="standard"
            size={sz}
            animated={animate && !isPreview}
          />
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {GaugeIcon && (
          <GaugeIcon
            className="h-3 w-3"
            strokeWidth={1.5}
            style={{ color: noData ? 'rgba(255,255,255,0.4)' : color }}
          />
        )}
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${noData ? 'text-white/70' : 'text-white'}`}
        >
          {label}
        </p>
      </div>

      {confidence > 0 && (
        <div className="mt-1 flex items-center gap-1">
          <ModeIcon className="h-2.5 w-2.5" strokeWidth={1.5} style={{ color, opacity: 0.7 }} />
          <span className="text-[8px] text-white/70">
            {dataMode === 'manual' ? 'Check-in' : dataMode === 'wearable' ? 'Device' : 'Blended'}
          </span>
        </div>
      )}
    </div>
  );
}
