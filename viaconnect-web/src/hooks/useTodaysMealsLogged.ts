'use client';

// useTodaysMealsLogged — counts how many of today's 4 meal slots
// (breakfast, lunch, dinner, snacks) have been logged or explicitly skipped.
// Mirrors QuickMealLogWidget's read path so the Daily Schedule gauge can
// include meal progress alongside supplement adherence.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type MealTab = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
const ALL_MEALS: MealTab[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export interface UseTodaysMealsLoggedResult {
  loggedCount: number;
  mealsTotal: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function useTodaysMealsLogged(): UseTodaysMealsLoggedResult {
  const [loggedCount, setLoggedCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const date = today();

      const [mealsRes, checkinRes] = await Promise.all([
        (supabase as any)
          .from('meal_logs')
          .select('meal_type')
          .eq('user_id', user.id)
          .eq('meal_date', date)
          .in('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']),
        (supabase as any)
          .from('daily_checkins')
          .select('breakfast_skipped, lunch_skipped, dinner_skipped, snacks_skipped')
          .eq('user_id', user.id)
          .eq('check_in_date', date)
          .maybeSingle(),
      ]);

      const logged = new Set<MealTab>();
      const meals = mealsRes.data ?? [];
      for (const m of meals) {
        const tab: MealTab = m.meal_type === 'snack' ? 'snacks' : m.meal_type;
        logged.add(tab);
      }
      const ck = checkinRes.data;
      if (ck) {
        for (const tab of ALL_MEALS) {
          if (ck[`${tab}_skipped`]) logged.add(tab);
        }
      }
      setLoggedCount(logged.size);
    } catch {
      // table/columns may not exist yet; leave count as-is
    }
  }, []);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  useEffect(() => {
    const onMeal = () => fetchCount();
    window.addEventListener('meal-logged', onMeal);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('meal-logged', onMeal);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchCount]);

  return { loggedCount, mealsTotal: ALL_MEALS.length };
}
