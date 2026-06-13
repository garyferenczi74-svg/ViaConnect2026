'use client';

// Gary (2026-06-12): shared remove-a-logged-meal hook. This is the Prompt
// 177i remove machinery extracted VERBATIM in behavior from
// TodaysMealsSummary so the Today's Meals card on /nutrition and the
// Today's Meals accordion on the My Nutrition hub share ONE undo
// implementation instead of two drifting copies:
//
//   1. Optimistic removal from every cached ['user-meals'] query.
//   2. A 5 second undo toast; the DELETE only fires when the window
//      expires, so a quick tap reverses without any server roundtrip.
//   3. Commit via DELETE /api/nutrition/meals/[mealId] with an 8 second
//      timeout; on failure the row is restored in cache (fail open) and
//      the user is told.
//   4. Flush on pagehide / visibilitychange hidden / unmount with
//      keepalive so navigating away inside the undo window still commits
//      the delete (the Gary 2026-06-09 fix; cancel-on-unmount silently
//      dropped the server delete and the button looked broken).
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Meal } from '@/lib/gordon/types';
import { safeLog } from '@/lib/utils/safe-log';
import { pendingMealDeletes } from './pendingMealDeletes';

// Undo window before the meal delete commits to the server. Long enough
// for a misclick recovery, short enough that the user does not wonder if
// the action succeeded. Five seconds matches the Gmail Undo Send default
// and the hydration delete toast cadence. (Prompt 177i.)
export const REMOVE_UNDO_WINDOW_MS = 5_000;
const REMOVE_API_TIMEOUT_MS = 8_000;

export interface UseRemoveMealResult {
  readonly removeMeal: (meal: Meal) => void;
}

export function useRemoveMeal(): UseRemoveMealResult {
  const queryClient = useQueryClient();
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Flush instead of cancel: fire any still pending delete immediately,
  // with keepalive so the request survives page unload. Leaving the
  // surface implicitly confirms the removal.
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
      // The keepalive delete commits the removal; clear the filter guard so the
      // pending registry does not outlive the request.
      pendingMealDeletes.remove(mealId);
    }
    timers.clear();
  }, []);

  useEffect(() => {
    // pagehide covers refresh, tab close, and SPA back/forward cache;
    // visibilitychange to hidden covers mobile app backgrounding
    // (Capacitor) where pagehide may not fire; the unmount return covers
    // in app navigation away from the surface.
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
        // Success: refetch so the cache converges to the true server state (the
        // row is gone now), THEN drop the pending filter guard. Clearing the
        // guard only after the refetch lands means the meal never flickers back
        // in the gap between un-filtering it and the fresh server state arriving.
        await queryClient.invalidateQueries({ queryKey: ['user-meals'] });
        pendingMealDeletes.remove(mealId);
      } catch (err) {
        safeLog.error('todays-meals.remove', 'delete failed; restoring row', {
          meal_id: mealId,
          error: err instanceof Error ? err.message : String(err),
        });
        // Half updated guard: stop filtering and restore the optimistically
        // removed row so the cards converge back to the server, which still has
        // the meal because the delete failed.
        pendingMealDeletes.remove(mealId);
        matchUserMealsQueries((curr) => {
          if (curr.some((m) => m.mealId === restoreMeal.mealId)) return curr;
          return [...curr, restoreMeal].sort((a, b) => {
            const aT = a.loggedAt ? Date.parse(a.loggedAt) : 0;
            const bT = b.loggedAt ? Date.parse(b.loggedAt) : 0;
            return bT - aT;
          });
        });
        toast.error('Could not remove the meal; restored it.');
        void queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      } finally {
        clearTimeout(timeoutId);
        pendingDeletes.current.delete(mealId);
      }
    },
    [matchUserMealsQueries, queryClient],
  );

  const removeMeal = useCallback(
    (meal: Meal) => {
      // Already pending: a second activation acts as an undo (the same effect as
      // the toast Undo button). Cancel the deferred commit, stop filtering, and
      // restore the row so the guard is never left stranded. From the Today's
      // meals UI this branch is not reachable today, because the pill unmounts the
      // instant a meal enters the registry (useUserMeals filters it out), but
      // keeping it self-contained protects any future surface that might show a
      // remove control for an already pending meal.
      const existing = pendingDeletes.current.get(meal.mealId);
      if (existing) {
        clearTimeout(existing);
        pendingDeletes.current.delete(meal.mealId);
        pendingMealDeletes.remove(meal.mealId);
        matchUserMealsQueries((curr) => {
          if (curr.some((m) => m.mealId === meal.mealId)) return curr;
          return [...curr, meal].sort((a, b) => {
            const aT = a.loggedAt ? Date.parse(a.loggedAt) : 0;
            const bT = b.loggedAt ? Date.parse(b.loggedAt) : 0;
            return bT - aT;
          });
        });
        toast.dismiss(`meal-remove-${meal.mealId}`);
        return;
      }

      // Optimistic remove from every cached user-meals query.
      matchUserMealsQueries((curr) => curr.filter((m) => m.mealId !== meal.mealId));
      // And keep it removed across refetches during the undo window. useUserMeals
      // filters any id in this registry out of every result, so logging or
      // loading another meal (which fires the realtime refetch) does not bring the
      // removed row back before the deferred DELETE commits.
      pendingMealDeletes.add(meal.mealId);

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
                // Stop filtering and restore in cache; the server was never asked.
                pendingMealDeletes.remove(meal.mealId);
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

  return { removeMeal };
}

export default useRemoveMeal;
