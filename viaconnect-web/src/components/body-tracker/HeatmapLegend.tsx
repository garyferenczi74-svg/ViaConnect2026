'use client';

// Prompt #85n: small legend strip beneath the avatar that decodes the
// three heat-map colors. Inverts label semantics for the muscle metric
// since gain is the good direction for muscle.

import type { Metric } from '@/lib/body-tracker/heatmap-colors';

interface HeatmapLegendProps {
  metric: Metric;
  className?: string;
}

export function HeatmapLegend({ metric, className }: HeatmapLegendProps) {
  const goodLabel = metric === 'fat' ? 'Fat Loss' : 'Muscle Gain';
  const badLabel = metric === 'fat' ? 'Fat Gain' : 'Muscle Loss';

  return (
    <div
      data-testid="heatmap-legend"
      className={`flex items-center justify-center gap-4 text-[10px] ${className ?? ''}`}
    >
      <div className="flex items-center gap-1">
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="text-white/40">{goodLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="text-white/40">No Change</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="text-white/40">{badLabel}</span>
      </div>
    </div>
  );
}
