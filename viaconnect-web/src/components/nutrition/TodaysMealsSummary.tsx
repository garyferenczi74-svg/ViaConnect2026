'use client';

// Prompt #169 followup per Gary 2026-05-15: Today's Meals card now groups
// today's meals into four collapsible sections (Breakfast / Lunch / Dinner /
// Snacks) instead of a flat chronological list. Section headers use the
// same per-meal gradient palette as the Dashboard QuickLogsMealTypeTab so the
// two surfaces feel unified. Sections auto-expand when a meal is logged for
// that type; user can manually toggle.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Coffee, Cookie, Droplet, Plus, Soup, Trash2, UtensilsCrossed } from 'lucide-react';
import type { Meal, MealType } from '@/lib/gordon/types';
import { MealLogEntryCard } from '@/components/dashboard/MealLogEntryCard';
import { HydrationFullSection } from '@/components/hydration/HydrationFullSection';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { formatVolumeLabel } from '@/components/hydration/HydrationRing';
import { safeLog } from '@/lib/utils/safe-log';

// Prompt 177i (2026-06-07): undo window before the meal delete commits to
// the server. Long enough for a misclick recovery, short enough that the
// user does not wonder if the action succeeded. Five seconds matches the
// Gmail Undo Send default and the hydration delete toast cadence.
const REMOVE_UNDO_WINDOW_MS = 5_000;
const REMOVE_API_TIMEOUT_MS = 8_000;

// Gary 2026-06-03: hydration shares the same accordion as the four meal
// sections. Local key union widens MealType to include 'hydration' for the
// open-set without polluting the Meal types upstream.
type SectionKey = MealType | 'hydration';

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

  // Gary 2026-06-03: hydration row pulls only the today total for the header
  // chip; the expanded body renders HydrationFullSection which owns its own
  // hooks for the ring + buttons + picker + history.
  const { data: hydrationToday } = useHydrationToday();
  const hydrationTotalMl = hydrationToday?.total_ml ?? 0;

  // Prompt 177i (2026-06-07): remove a logged meal from a section. The
  // optimistic remove hides the row from the query cache immediately and
  // an undo toast offers a 5 second window to restore. The DELETE call
  // only fires once the window expires, so a quick tap reverses without
  // any server roundtrip. Pending timers live in a ref so we can cancel
  // them on undo or on unmount.
  const queryClient = useQueryClient();
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Fix (Gary 2026-06-09): the original cleanup CANCELED pending delete
  // timers on unmount, so removing a meal and then navigating away or
  // refreshing within the 5 second undo window dropped the server delete
  // and the meal returned on the next load (the remove button looked
  // broken). Flush instead: fire any still pending delete immediately, with
  // keepalive so the request survives page unload. Leaving the surface
  // implicitly confirms the removal, which is the correct undo semantics.
  const flushPendingDeletes = useCallback(() => {
    const timers = pendingDeletes.current;
    if (timers.size === 0) return;
    for (const [mealId, t] of timers.entries()) {
      clearTimeout(t);
      try {
        void fetch(`/api/nutrition/meals/${mealId}`, { method: 'DELETE', keepalive: true });
      } catch {
        // best effort during unload; nothing actionable here
      }
    }
    timers.clear();
  }, []);

  useEffect(() => {
    // pagehide covers refresh, tab close, and SPA back/forward cache;
    // visibilitychange to hidden covers mobile app backgrounding (Capacitor)
    // where pagehide may not fire; the unmount return covers in app
    // navigation away from the nutrition surface.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingDeletes();
    };
    window.addEventListener('pagehide', flushPendingDeletes);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushPendingDeletes);
      document.removeEventListener('visibilitychange', onVisibility);
      flushPendingDeletes();
    };
  }, [flushPendingDeletes]);

  const matchUserMealsQueries = useCallback(
    (predicate: (meals: Meal[]) => Meal[]) => {
      queryClient.setQueriesData<Meal[]>({ queryKey: ['user-meals'] }, (curr) => {
        if (!Array.isArray(curr)) return curr;
        return predicate(curr);
      });
    },
    [queryClient],
  );

  const commitRemove = useCallback(
    async (mealId: string, restoreMeal: Meal) => {
      // Resilience hardening: 8s timeout + try/catch fail open + safeLog.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REMOVE_API_TIMEOUT_MS);
      try {
        const resp = await fetch(`/api/nutrition/meals/${mealId}`, {
          method: 'DELETE',
          signal: controller.signal,
        });
        if (!resp.ok) {
          throw new Error(`status ${resp.status}`);
        }
        safeLog.info('todays-meals.remove', 'meal removed', { meal_id: mealId });
      } catch (err) {
        safeLog.error('todays-meals.remove', 'delete failed; restoring row', {
          meal_id: mealId,
          error: err instanceof Error ? err.message : String(err),
        });
        // Half updated guard: restore the optimistically removed row so
        // the cards do not stay out of sync with the server.
        matchUserMealsQueries((curr) => {
          if (curr.some((m) => m.mealId === restoreMeal.mealId)) return curr;
          return [...curr, restoreMeal].sort((a, b) => {
            const aT = a.loggedAt ? Date.parse(a.loggedAt) : 0;
            const bT = b.loggedAt ? Date.parse(b.loggedAt) : 0;
            return bT - aT;
          });
        });
        toast.error('Could not remove the meal; restored it.');
      } finally {
        clearTimeout(timeoutId);
        pendingDeletes.current.delete(mealId);
        // Final invalidation so realtime + cache converge to the true
        // server state on the next render.
        void queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      }
    },
    [matchUserMealsQueries, queryClient],
  );

  const handleRemoveMeal = useCallback(
    (meal: Meal) => {
      // Already pending: undo and bail out.
      const existing = pendingDeletes.current.get(meal.mealId);
      if (existing) {
        clearTimeout(existing);
        pendingDeletes.current.delete(meal.mealId);
        return;
      }

      // Optimistic remove from every cached user-meals query.
      matchUserMealsQueries((curr) => curr.filter((m) => m.mealId !== meal.mealId));

      const timer = setTimeout(() => {
        void commitRemove(meal.mealId, meal);
      }, REMOVE_UNDO_WINDOW_MS);
      pendingDeletes.current.set(meal.mealId, timer);

      const toastId = `meal-remove-${meal.mealId}`;
      toast(
        (t) => (
          <span className="flex items-center gap-3">
            <span>Meal removed.</span>
            <button
              type="button"
              onClick={() => {
                const pending = pendingDeletes.current.get(meal.mealId);
                if (pending) {
                  clearTimeout(pending);
                  pendingDeletes.current.delete(meal.mealId);
                }
                // Restore in cache; the server was never asked.
                matchUserMealsQueries((curr) => {
                  if (curr.some((m) => m.mealId === meal.mealId)) return curr;
                  return [...curr, meal].sort((a, b) => {
                    const aT = a.loggedAt ? Date.parse(a.loggedAt) : 0;
                    const bT = b.loggedAt ? Date.parse(b.loggedAt) : 0;
                    return bT - aT;
                  });
                });
                toast.dismiss(t.id);
              }}
              className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[12px] font-semibold text-white hover:bg-white/20"
            >
              Undo
            </button>
          </span>
        ),
        { id: toastId, duration: REMOVE_UNDO_WINDOW_MS },
      );
    },
    [commitRemove, matchUserMealsQueries],
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
  // pops open here without manual click). Hydration shares the same set
  // but never auto-opens; it stays closed until tapped.
  const [openSet, setOpenSet] = useState<Set<SectionKey>>(() => {
    const s = new Set<SectionKey>();
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

  const handleToggle = (id: SectionKey) => {
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
                          {/* Prompt 177i (2026-06-07): per-row trash control
                              when the section holds more than one meal so
                              the user can target a specific misfiled entry.
                              Single meal sections fall through to the bottom
                              Remove button below the list instead. */}
                          {list.length > 1 ? (
                            <div className="flex items-stretch gap-2">
                              <div className="flex-1 min-w-0">
                                <MealLogEntryCard meal={meal} userTimezone={tz} />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMeal(meal)}
                                aria-label={`Remove this ${def.label.toLowerCase()}`}
                                className="flex w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/5 text-[#F2A66B] transition-colors hover:bg-[#B75E18]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75E18]/40"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          ) : (
                            <MealLogEntryCard meal={meal} userTimezone={tz} />
                          )}
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
                  {/* Prompt 177i (2026-06-07): single meal sections get one
                      bottom Remove button because a per row trash is
                      redundant when only one row exists. */}
                  {list.length === 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveMeal(list[0])}
                      className="inline-flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/5 px-3 py-2 text-[12px] font-medium text-[#F2A66B] transition-colors hover:bg-[#B75E18]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75E18]/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Remove {def.label.toLowerCase() === 'snacks' ? 'this snack' : `this ${def.label.toLowerCase()}`}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Gary 2026-06-03: hydration 5th section. Header pill matches
            Breakfast/Lunch/Dinner/Snacks gradient family; expanded body is
            the full HydrationFullSection (ring + quick log + intake timeline
            + caffeine overlay + breakdown + electrolyte + picker + history +
            disclaimer), the same body the detail route renders. */}
        {(() => {
          const isOpen = openSet.has('hydration');
          return (
            <div>
              <button
                type="button"
                onClick={() => handleToggle('hydration')}
                aria-expanded={isOpen}
                className="group relative flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-white/15 bg-gradient-to-br from-sky-600/40 via-blue-500/20 to-sky-700/30 px-3 py-2.5 text-[13px] font-semibold text-white backdrop-blur-xl transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:text-[14px]"
              >
                <span className="flex items-center gap-2">
                  <Droplet className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                  <span>Hydration</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] tabular-nums text-white/85">
                    {formatVolumeLabel(hydrationTotalMl)}
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
                <div className="mt-2">
                  <HydrationFullSection logSurface="nutrivision_card" />
                </div>
              ) : null}
            </div>
          );
        })()}
      </div>
    </section>
  );
}

export default TodaysMealsSummary;
