'use client';

// Prompt #168 Apply B: TodaysMealsSummary.
// Filters meals to "today" in the user's local timezone (not UTC) per
// Section 4.2 of the plan. Builds a YYYY-MM-DD key for each meal in `tz` and
// matches against today's local date string.
//
// Empty state: subtle Plus icon + "No meals logged today yet". The card never
// auto-redirects to log-meal; that's a page-level concern wired in Apply C.

import { useMemo } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import type { Meal } from '@/lib/gordon/types';
import { MealLogEntryCard } from '@/components/dashboard/MealLogEntryCard';

export interface TodaysMealsSummaryProps {
  readonly meals: Meal[];
  readonly userTimezone?: string;
}

function localDateKey(iso: string, timezone: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(d);
  } catch {
    return '';
  }
}

export function TodaysMealsSummary(props: TodaysMealsSummaryProps) {
  const { meals, userTimezone } = props;
  const tz = useMemo(
    () => userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [userTimezone],
  );

  const todaysMeals = useMemo(() => {
    const todayKey = localDateKey(new Date().toISOString(), tz);
    if (!todayKey) return [];
    return meals
      .filter((m) => localDateKey(m.loggedAt, tz) === todayKey)
      .slice()
      .sort((a, b) => Date.parse(b.loggedAt) - Date.parse(a.loggedAt));
  }, [meals, tz]);

  return (
    <section className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054] text-white md:p-2">
      <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-white/70" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold text-white">Today&apos;s Meals</h2>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[12px] tabular-nums text-white/80">
          {todaysMeals.length}
        </span>
      </header>

      <div className="px-3 pb-3 md:px-4 md:pb-4">
        {todaysMeals.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 py-5 text-white/60">
            <Plus className="h-4 w-4 text-white/50" strokeWidth={1.5} />
            <span className="text-[13px]">No meals logged today yet</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaysMeals.map((meal) => (
              <li key={meal.mealId}>
                <MealLogEntryCard meal={meal} userTimezone={tz} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default TodaysMealsSummary;
