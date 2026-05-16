'use client';

// Prompt #169 followup per Gary 2026-05-15: Today's Meals card now groups
// today's meals into four collapsible sections (Breakfast / Lunch / Dinner /
// Snacks) instead of a flat chronological list. Section headers use the
// same per-meal gradient palette as the Dashboard QuickLogsMealTypeTab so the
// two surfaces feel unified. Sections auto-expand when a meal is logged for
// that type; user can manually toggle.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Coffee, Cookie, Plus, Soup, UtensilsCrossed } from 'lucide-react';
import type { Meal, MealType } from '@/lib/gordon/types';
import { MealLogEntryCard } from '@/components/dashboard/MealLogEntryCard';

export interface TodaysMealsSummaryProps {
  readonly meals: Meal[];
  readonly userTimezone?: string;
}

interface MealTypeDef {
  readonly id: MealType;
  readonly label: string;
  readonly icon: typeof Coffee;
  readonly gradient: string;
}

// Mirror the Dashboard QuickLogsMealTypeTab idle gradient palette so a user
// scanning between dashboard and nutrition reads the same color = same meal.
const MEAL_TYPE_DEFS: ReadonlyArray<MealTypeDef> = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, gradient: 'from-amber-600/40 via-orange-600/20 to-amber-700/30' },
  { id: 'lunch', label: 'Lunch', icon: Soup, gradient: 'from-purple-500/40 via-purple-600/20 to-purple-700/30' },
  { id: 'dinner', label: 'Dinner', icon: UtensilsCrossed, gradient: 'from-indigo-500/40 via-indigo-600/20 to-violet-600/30' },
  { id: 'snack', label: 'Snacks', icon: Cookie, gradient: 'from-rose-500/40 via-pink-500/20 to-pink-600/30' },
];

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
      .sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt));
  }, [meals, tz]);

  const mealsByType = useMemo<Record<MealType, Meal[]>>(() => {
    const grouped: Record<MealType, Meal[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const m of todaysMeals) {
      grouped[m.mealType].push(m);
    }
    return grouped;
  }, [todaysMeals]);

  // openSet tracks which sections are currently expanded. Initialized from
  // mealsByType counts so any type with at least one meal opens by default.
  // The effect below auto-opens a section when its count transitions from
  // zero to one (e.g., user logs breakfast on the dashboard, this section
  // pops open here without manual click).
  const [openSet, setOpenSet] = useState<Set<MealType>>(() => {
    const s = new Set<MealType>();
    for (const def of MEAL_TYPE_DEFS) {
      if (mealsByType[def.id].length > 0) s.add(def.id);
    }
    return s;
  });

  const breakfastCount = mealsByType.breakfast.length;
  const lunchCount = mealsByType.lunch.length;
  const dinnerCount = mealsByType.dinner.length;
  const snackCount = mealsByType.snack.length;

  useEffect(() => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const def of MEAL_TYPE_DEFS) {
        if (mealsByType[def.id].length > 0 && !prev.has(def.id)) {
          next.add(def.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [breakfastCount, lunchCount, dinnerCount, snackCount, mealsByType]);

  const handleToggle = (id: MealType) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054]/40 backdrop-blur-md text-white md:p-2">
      <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-white/70" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold text-white">Today&apos;s Meals</h2>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[12px] tabular-nums text-white/80">
          {todaysMeals.length}
        </span>
      </header>

      <div className="flex flex-col gap-3 px-3 pb-3 md:px-4 md:pb-4">
        {MEAL_TYPE_DEFS.map((def) => {
          const list = mealsByType[def.id];
          const isOpen = openSet.has(def.id);
          const Icon = def.icon;
          return (
            <div key={def.id}>
              <button
                type="button"
                onClick={() => handleToggle(def.id)}
                aria-expanded={isOpen}
                className={`group relative flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-white/15 bg-gradient-to-br px-3 py-2.5 text-[13px] font-semibold text-white backdrop-blur-xl transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:text-[14px] ${def.gradient}`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                  <span>{def.label}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] tabular-nums text-white/85">
                    {list.length}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                  strokeWidth={1.5}
                />
              </button>

              {isOpen ? (
                <div className="mt-2 flex flex-col gap-2">
                  {list.length === 0 ? (
                    <p className="px-3 text-[12px] text-white/50">
                      No {def.label.toLowerCase()} logged yet today.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {list.map((meal) => (
                        <li key={meal.mealId}>
                          <MealLogEntryCard meal={meal} userTimezone={tz} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Per Gary 2026-05-15: Add CTA suppressed on B/L/D (replace */}
                  {/* on save makes "add another" meaningless). Snacks keep the */}
                  {/* CTA because snack_index lets multiple stack per day. */}
                  {def.id === 'snack' ? (
                    <Link
                      href="/dashboard"
                      className="inline-flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-gradient-to-br from-[#1A2744]/60 to-[#2DA5A0]/30 px-3 py-2 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all hover:from-[#1A2744]/75 hover:to-[#2DA5A0]/45 hover:shadow-lg hover:shadow-black/10"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Add a snack</span>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default TodaysMealsSummary;
