'use client';

// Prompt 179 Section 7.5, renamed to "Adherence" per Prompt 179b (the tab is
// now Progress, so the "and Progress" echo is dropped). Content unchanged.

import { CalendarCheck, Utensils, Scale, CalendarClock } from 'lucide-react';
import type { AdherenceView, TargetView } from './useActiveGoal';

function formatDate(d: string | null): string {
  if (!d) return 'Pending more data';
  return new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function Adherence({
  adherence,
  target,
  projectedDate,
}: {
  adherence: AdherenceView | null;
  target: TargetView | null;
  projectedDate: string | null;
}) {
  if (!adherence) return null;

  const stats: Array<{ label: string; value: string; Icon: typeof Scale }> = [
    { label: `Days logged (last ${adherence.windowDays})`, value: `${adherence.daysLogged}`, Icon: CalendarCheck },
    {
      label: 'Average intake vs target',
      value: target ? `${adherence.avgKcal} vs ${target.calorie_target_kcal} kcal` : `${adherence.avgKcal} kcal`,
      Icon: Utensils,
    },
    { label: 'Latest smoothed weight', value: `${adherence.latestWeightLb} lb`, Icon: Scale },
    { label: 'Projected completion', value: formatDate(projectedDate), Icon: CalendarClock },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Adherence</h2>
        <span className="text-xs text-white/50">Arnold</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <s.Icon className="h-4 w-4 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-white/55">{s.label}</p>
              <p className="text-sm font-semibold text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
