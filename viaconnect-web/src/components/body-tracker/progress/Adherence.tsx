'use client';

// Prompt 179 Section 7.5, renamed to "Adherence" per Prompt 179b. Prompt 201
// (2026-06-15) DD-5: restyled into an Arnold-attributed ProgressCard with a
// 14-day logging streak row. The payload carries the logged COUNT over the
// window, not a per-day pattern, so the first `filled` dots fill and the label
// states the count (fail-open). The weight-vs-projected delta chip is omitted
// because the adherence payload carries no projected-vs-actual delta field; that
// is flagged for a later selector change, not faked here.

import { CalendarCheck, Utensils, Scale, CalendarClock } from 'lucide-react';
import type { AdherenceView, TargetView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';

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

  const filled = Math.max(0, Math.min(adherence.windowDays, adherence.daysLogged));
  const dots = Array.from({ length: adherence.windowDays }, (_, i) => i < filled);

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
    <ProgressCard icon={CalendarCheck} accent="teal" attributionSlug="arnold">
      <h2 className="text-sm font-semibold text-white">Adherence</h2>

      {/* DD-5: 14-day logging streak row. */}
      <div className="mb-4 mt-3">
        <p className="mb-1.5 text-[11px] text-white/55">
          Logged {filled} of the last {adherence.windowDays} days
        </p>
        <div className="flex flex-wrap gap-1">
          {dots.map((on, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${on ? 'bg-[#2DA5A0]' : 'border border-white/20'}`}
            />
          ))}
        </div>
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
    </ProgressCard>
  );
}
