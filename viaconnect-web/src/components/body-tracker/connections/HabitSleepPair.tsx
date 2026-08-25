'use client';

import { Moon, Pill } from 'lucide-react';
import type { HabitSleepPairView } from '@/lib/body-tracker/habit-sleep-pair';

interface HabitSleepPairProps {
  pair: HabitSleepPairView;
}

export function HabitSleepPair({ pair }: HabitSleepPairProps) {
  if (!pair.visible || pair.kind !== 'visible' || !pair.habitName || !pair.sentence) {
    return null;
  }

  return (
    <div
      data-habit-sleep-pair="visible"
      data-habit-name={pair.habitName}
      data-habit-dimension={pair.dimension}
      className="mt-3 rounded-2xl border border-white/[0.08] bg-[#1A2744]/80 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Pill className="h-4 w-4 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
          <span className="text-sm font-semibold text-white whitespace-normal break-words">
            {pair.habitName}
          </span>
        </div>
        <span className="text-white/30" aria-hidden>
          ·
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <Moon className="h-4 w-4 shrink-0 text-white/70" strokeWidth={1.5} aria-hidden />
          <span className="text-sm font-semibold text-white">{pair.dimension}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-white/50 whitespace-normal break-words">
        {pair.sentence}
      </p>
    </div>
  );
}
