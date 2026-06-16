'use client';

// Prompt 201 (2026-06-15) DD-2: the Progress to Goal hero gauge. A read-only
// signal tile that reuses PlasmaGauge (no new gauge math) and the pure
// computeProgressToGoal helper. Direction-aware for loss and gain goals.
// Fail-open: when there is no smoothed weight yet, it shows an empty state.

import { Target } from 'lucide-react';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import { ProgressCard } from './ProgressCard';
import { computeProgressToGoal } from './progressMath';

export interface ProgressToGoalCardProps {
  readonly startLb?: number | null;
  readonly currentLb?: number | null;
  readonly goalLb?: number | null;
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[11px] uppercase tracking-wide text-white/45">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}

export function ProgressToGoalCard({ startLb, currentLb, goalLb }: ProgressToGoalCardProps) {
  const result =
    startLb != null && goalLb != null
      ? computeProgressToGoal({ startLb, currentLb, goalLb })
      : null;

  return (
    <ProgressCard
      icon={Target}
      accent="teal"
      attributionSlug="arnold"
      className="h-full"
      contentClassName="items-center text-center"
    >
      <h2 className="text-sm font-semibold text-white">Progress to Goal</h2>

      {result ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <PlasmaGauge
            value={result.pct}
            metric="plasmateal"
            size={176}
            valueSuffix="%"
            caption="COMPLETE"
            ariaLabel={`${result.pct} percent of the way to your goal weight`}
          />
          <div className="mt-3 grid w-full grid-cols-3 gap-2">
            <Readout label="Start" value={`${Math.round(startLb as number)} lb`} />
            <Readout label="Current" value={`${Math.round(currentLb as number)} lb`} />
            <Readout label="Goal" value={`${Math.round(goalLb as number)} lb`} />
          </div>
          <p className="mt-2 text-xs text-white/55">
            {result.lbsToGo} lb to {result.direction === 'loss' ? 'lose' : 'gain'}
          </p>
        </div>
      ) : (
        <div className="mt-2 flex flex-1 flex-col items-center justify-center">
          <PlasmaGauge
            value={0}
            metric="plasmateal"
            size={176}
            animated={false}
            valueSuffix="%"
            caption="COMPLETE"
            ariaLabel="Progress to goal not available yet"
          />
          <p className="mt-3 text-xs text-white/55">Start logging to see progress.</p>
        </div>
      )}
    </ProgressCard>
  );
}

export default ProgressToGoalCard;
