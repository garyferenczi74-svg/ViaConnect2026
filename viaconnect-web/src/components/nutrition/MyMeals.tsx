'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bookmark, RotateCcw } from 'lucide-react';

interface SavedMeal {
  id: string;
  name: string;
  meal_type: string;
  photo_url: string | null;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  times_logged: number;
}

export function MyMeals({ onRelog }: { onRelog?: () => void }) {
  const [meals, setMeals] = useState<SavedMeal[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await (supabase as any)
          .from('saved_meals')
          .select('id, name, meal_type, photo_url, totals, times_logged')
          .eq('user_id', user.id)
          .order('times_logged', { ascending: false })
          .limit(8);
        if (data) setMeals(data);
      } catch { /* table may not exist yet */ }
    })();
  }, []);

  const relog = useCallback(async (meal: SavedMeal) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).from('meal_logs').insert({
        user_id: user.id,
        meal_type: meal.meal_type,
        log_method: 'quick',
        quality_rating: 3,
        description: meal.name,
        calories: meal.totals.calories,
        protein_g: meal.totals.protein,
        carbs_g: meal.totals.carbs,
        fat_g: meal.totals.fat,
        meal_date: new Date().toISOString().split('T')[0],
      });

      await (supabase as any)
        .from('saved_meals')
        .update({ times_logged: meal.times_logged + 1, last_logged_at: new Date().toISOString() })
        .eq('id', meal.id);

      setMeals((prev) =>
        prev.map((m) => (m.id === meal.id ? { ...m, times_logged: m.times_logged + 1 } : m)),
      );
      try { window.dispatchEvent(new CustomEvent('meal-logged')); } catch {}
      onRelog?.();
    } catch { /* table may not exist yet */ }
  }, [onRelog]);

  if (meals.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">My Meals</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {meals.map((meal) => (
          <button
            key={meal.id}
            onClick={() => relog(meal)}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition-all hover:bg-white/[0.06]"
          >
            {meal.photo_url && (
              <img src={meal.photo_url} alt={meal.name} className="h-24 w-full object-cover" />
            )}
            <div className="p-3">
              <p className="truncate text-sm font-medium text-white">{meal.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                {meal.totals.calories} cal
                <span className="text-white/20">·</span>
                <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
                {meal.times_logged}×
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
