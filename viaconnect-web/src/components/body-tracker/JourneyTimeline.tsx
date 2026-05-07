'use client';

import { TrendingDown, Dumbbell, Flag, Sparkles } from 'lucide-react';

export type JourneyTimelineType = 'weight_loss' | 'muscle_building';

interface JourneyTimelineProps {
  journeyType: JourneyTimelineType;
  startedAt: string;
  startingValue: number;
  currentValue: number;
  goalValue: number;
  unit: string;
}

function daysSince(iso: string): number {
  try {
    const start = new Date(iso).getTime();
    const ms = Date.now() - start;
    return Math.max(0, Math.floor(ms / 86_400_000));
  } catch {
    return 0;
  }
}

function progressPct(
  type: JourneyTimelineType,
  start: number,
  current: number,
  goal: number,
): number {
  const denom = type === 'weight_loss' ? start - goal : goal - start;
  if (denom === 0) return 0;
  const num = type === 'weight_loss' ? start - current : current - start;
  return Math.max(0, Math.min(100, (num / denom) * 100));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function JourneyTimeline({
  journeyType,
  startedAt,
  startingValue,
  currentValue,
  goalValue,
  unit,
}: JourneyTimelineProps) {
  const Icon = journeyType === 'weight_loss' ? TrendingDown : Dumbbell;
  const accent = journeyType === 'weight_loss' ? '#2DA5A0' : '#B75E18';
  const days = daysSince(startedAt);
  const pct = progressPct(journeyType, startingValue, currentValue, goalValue);
  const remaining = journeyType === 'weight_loss'
    ? Math.max(0, currentValue - goalValue)
    : Math.max(0, goalValue - currentValue);
  const moved = journeyType === 'weight_loss'
    ? Math.max(0, startingValue - currentValue)
    : Math.max(0, currentValue - startingValue);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
      <header className="mb-4 flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}22` }}
        >
          <Icon size={18} strokeWidth={1.5} style={{ color: accent }} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">
            Your {journeyType === 'weight_loss' ? 'Weight Loss' : 'Muscle Building'} Journey
          </h3>
          <p className="text-xs text-white/50">
            Started: {formatDate(startedAt)} ({days} {days === 1 ? 'day' : 'days'} ago)
          </p>
        </div>
      </header>

      <div className="relative my-5 h-2 rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2"
          style={{ left: `${pct}%`, backgroundColor: accent, borderColor: '#1A2744' }}
          aria-label="Current position"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40">Start</p>
          <p className="text-sm font-semibold text-white">
            {startingValue.toFixed(1)} <span className="text-white/40">{unit}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Today</p>
          <p className="text-sm font-semibold text-white">
            {currentValue.toFixed(1)} <span className="text-white/40">{unit}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 rounded-md text-[10px] uppercase tracking-wider text-white/40">
            <Flag size={10} strokeWidth={1.5} /> Goal
          </div>
          <p className="text-sm font-semibold" style={{ color: accent }}>
            {goalValue.toFixed(1)} <span className="opacity-70">{unit}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/65">
        <Sparkles size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-[#FBBF24]" />
        <p>
          {moved.toFixed(1)} {unit} moved, {remaining.toFixed(1)} {unit} to your goal.
          {pct >= 100 ? ' Goal hit; nice work.' : pct >= 50 ? ' Past the halfway mark.' : ' Steady wins compound.'}
        </p>
      </div>
    </section>
  );
}
