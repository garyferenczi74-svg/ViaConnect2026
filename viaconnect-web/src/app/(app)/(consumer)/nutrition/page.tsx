'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Apple, Camera, ChevronRight, Dna, PenLine, ArrowRight, Smartphone } from 'lucide-react';
import { NutritionScoreCard } from '@/components/nutrition/NutritionScoreCard';
import { QuickMealLog } from '@/components/nutrition/QuickMealLog';
import { PhotoMealLog } from '@/components/nutrition/PhotoMealLog';
import { ManualMealEntry } from '@/components/nutrition/ManualMealEntry';
import { NutritionInsights } from '@/components/nutrition/NutritionInsights';
import { MealHistory } from '@/components/nutrition/MealHistory';
import { MyMeals } from '@/components/nutrition/MyMeals';

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
        const avgQ = data.reduce((s: number, r: { quality_rating?: number }) => s + (r.quality_rating ?? 2), 0) / count;
        const freqScore = Math.min(100, (count / 3) * 60);
        const qualScore = (avgQ / 4) * 100;
        setScore(Math.round(freqScore * 0.4 + qualScore * 0.6));
      }
    } catch { /* table may not exist yet */ }
  };

  useEffect(() => { loadMealCount(); }, []);

  const TABS = [
    { id: 'quick' as const, label: 'Quick Log', icon: Apple },
    { id: 'photo' as const, label: 'Photo AI', icon: Camera },
    { id: 'manual' as const, label: 'Manual', icon: PenLine },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Nutrition</h1>
          <p className="mt-1 text-sm text-white/40">Track your daily nutrition</p>
        </div>
        <Link
          href="/nutrition/guide"
          className="flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2 text-xs font-medium text-[#2DA5A0] transition-all hover:bg-[#2DA5A0]/20"
        >
          <Dna className="h-3.5 w-3.5" strokeWidth={1.5} />
          Nutrition by Genetics
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>

      <NutritionScoreCard score={score} mealsLoggedToday={mealsToday} />

      {/* Connect Your App */}
      <Link
        href="/plugins/apps"
        className="group block rounded-2xl border border-[#B75E18]/20 bg-gradient-to-br from-[#B75E18]/10 via-[#B75E18]/[0.04] to-transparent p-5 transition-all hover:border-[#B75E18]/40 hover:shadow-[0_0_30px_rgba(183,94,24,0.10)]"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#B75E18]/30 bg-gradient-to-br from-[#1A2744] to-[#B75E18]">
            <Smartphone className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white">Connect Your App</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Link MyFitnessPal, Cronometer, Strava, Apple Health and more so your
              nutrition log learns from your daily routine.
            </p>
            <div className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/15 px-4 py-2 text-sm font-semibold text-[#B75E18] transition-all group-hover:border-[#B75E18]/50 group-hover:bg-[#B75E18]/25">
              <Smartphone className="h-4 w-4" strokeWidth={1.5} />
              Browse Apps
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </Link>

      <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Log a Meal</h3>

        <div className="mb-4 flex gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            const isDisabled = 'disabled' in t && !!(t as unknown as { disabled?: boolean }).disabled;
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
        {tab === 'photo' && <PhotoMealLog onSaved={loadMealCount} />}
        {tab === 'manual' && <ManualMealEntry onSaved={loadMealCount} />}
      </div>

      <MyMeals onRelog={loadMealCount} />

      <NutritionInsights mealsLoggedToday={mealsToday} score={score} />

      <MealHistory />
    </div>
  );
}
