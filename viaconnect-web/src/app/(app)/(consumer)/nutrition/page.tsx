'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Apple, Camera } from 'lucide-react';
import { NutritionScoreCard } from '@/components/nutrition/NutritionScoreCard';
import { QuickMealLog } from '@/components/nutrition/QuickMealLog';
import { ManualMealEntry } from '@/components/nutrition/ManualMealEntry';
import { NutritionInsights } from '@/components/nutrition/NutritionInsights';
import { MealHistory } from '@/components/nutrition/MealHistory';

export default function NutritionPage() {
  const [mealsToday, setMealsToday] = useState(0);
  const [score, setScore] = useState(0);
  const [tab, setTab] = useState<'quick' | 'photo' | 'manual'>('quick');

  const loadMealCount = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await (supabase as any)
        .from('meal_logs')
        .select('id, quality_rating')
        .eq('user_id', user.id)
        .eq('meal_date', today);

      const count = data?.length ?? 0;
      setMealsToday(count);

      if (count > 0) {
        const avgQ = data.reduce((s: number, r: any) => s + (r.quality_rating ?? 2), 0) / count;
        const freqScore = Math.min(100, (count / 3) * 60);
        const qualScore = (avgQ / 4) * 100;
        setScore(Math.round(freqScore * 0.4 + qualScore * 0.6));
      }
    } catch { /* table may not exist yet */ }
  };

  useEffect(() => { loadMealCount(); }, []);

  const TABS = [
    { id: 'quick' as const, label: 'Quick Log', icon: Apple },
    { id: 'photo' as const, label: 'Photo AI', icon: Camera, disabled: true },
    { id: 'manual' as const, label: 'Manual', icon: Apple },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Nutrition</h1>
        <p className="mt-1 text-sm text-white/40">Track your daily nutrition</p>
      </div>

      <NutritionScoreCard score={score} mealsLoggedToday={mealsToday} />

      <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Log a Meal</h3>

        <div className="mb-4 flex gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            const isDisabled = 'disabled' in t && t.disabled;
            return (
              <button
                key={t.id}
                onClick={() => !isDisabled && setTab(t.id)}
                disabled={isDisabled}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  isActive
                    ? 'border border-[#B75E18]/40 bg-[#B75E18]/20 text-[#B75E18]'
                    : isDisabled
                      ? 'cursor-not-allowed border border-white/[0.04] text-white/20'
                      : 'border border-white/[0.06] text-white/50 hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="h-3 w-3" strokeWidth={1.5} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'quick' && <QuickMealLog />}
        {tab === 'photo' && (
          <p className="py-6 text-center text-xs text-white/30">
            Photo AI logging coming soon
          </p>
        )}
        {tab === 'manual' && <ManualMealEntry onSaved={loadMealCount} />}
      </div>

      <NutritionInsights mealsLoggedToday={mealsToday} score={score} />

      <MealHistory />
    </div>
  );
}
