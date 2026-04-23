'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Apple, Camera, ChevronRight, Dna, PenLine, ArrowRight, Smartphone, Upload } from 'lucide-react';
import { NutritionScoreCard } from '@/components/nutrition/NutritionScoreCard';
import { QuickMealLogWidget } from '@/components/dashboard/QuickMealLogWidget';
import { PhotoMealLog } from '@/components/nutrition/PhotoMealLog';
import { ManualMealEntry } from '@/components/nutrition/ManualMealEntry';
import { NutritionInsights } from '@/components/nutrition/NutritionInsights';
import { MealHistory } from '@/components/nutrition/MealHistory';
import { MyMeals } from '@/components/nutrition/MyMeals';
import { ConnectedAppMealDropdown } from '@/components/nutrition/ConnectedAppMealDropdown';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';

const NUTRITION_HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Food%203.png';

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
    { id: 'manual' as const, label: 'Log Full Meal', icon: PenLine },
  ];

  return (
    <>
    <MobileHeroBackground src={NUTRITION_HERO_IMAGE} overlayOpacity={0.55} objectPosition="center top" priority />
    <div className="relative z-10 min-h-screen text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Nutrition</h1>
        <p className="mt-1 text-sm text-white/40">Track your daily nutrition</p>
      </div>

      <NutritionScoreCard score={score} mealsLoggedToday={mealsToday} />

      <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Log a Meal</h3>

        <div className="mb-4">
          <ConnectedAppMealDropdown />
        </div>

        <div className="mb-4 flex gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                  isActive
                    ? 'border border-[#B75E18]/40 bg-[#B75E18]/20 text-[#B75E18]'
                    : 'border border-white/[0.06] text-white/50 hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="h-3 w-3" strokeWidth={1.5} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'quick' && <QuickMealLogWidget hideHeader onSaved={loadMealCount} />}
        {tab === 'photo' && <PhotoMealLog onSaved={loadMealCount} />}
        {tab === 'manual' && <ManualMealEntry onSaved={loadMealCount} />}
      </div>

      {/* Nutrition by Genetics — full-width tab.
          Requires a nutritional genetic test (NutrigenDX™ or equivalent)
          to unlock the personalized protocol. */}
      <section className="rounded-2xl border border-[#2DA5A0]/30 bg-[#1E3054]/25 backdrop-blur-md p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
            <Dna className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white">Nutrition by Genetics</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60 sm:text-sm">
              Unlock personalized nutrition guidance based on your genetic
              blueprint. A NutrigenDX™ panel (or another nutritional genetic
              test) must be added to your profile before the genetic nutrition
              protocol can be generated.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
              <Link
                href="/genetics"
                className="group/cta relative flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(45,165,160,0.35)] active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover/cta:opacity-100" />
                <span className="relative">See NutrigenDX Results</span>
                <ArrowRight className="relative h-4 w-4" strokeWidth={2} />
              </Link>
              <div className="flex flex-col items-stretch gap-1">
                <Link
                  href="/genetics"
                  className="group/cta relative flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(183,94,24,0.35)] active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #B75E18 0%, #1E3054 100%)' }}
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover/cta:opacity-100" />
                  <Upload className="relative h-4 w-4" strokeWidth={2} />
                  <span className="relative">Upload Nutrition Test</span>
                </Link>
                <p className="text-[10px] leading-tight text-white/55 text-center">
                  23andMe · AncestryDNA · MyHeritage · Viome · other raw files
                </p>
              </div>
              <Link
                href="/nutrition/guide"
                className="group/cta relative flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(39,174,96,0.35)] active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #27AE60 0%, #1E3054 100%)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover/cta:opacity-100" />
                <span className="relative">Review Nutrition Results</span>
                <ArrowRight className="relative h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Connect Your App */}
      <Link
        href="/plugins/apps"
        className="group block rounded-2xl border border-[#B75E18]/30 bg-[#B75E18]/12 backdrop-blur-md p-5 transition-all hover:border-[#B75E18]/50 hover:bg-[#B75E18]/20 hover:shadow-[0_0_30px_rgba(183,94,24,0.15)]"
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
            <div
              className="relative mt-3 inline-flex min-h-[40px] items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all group-hover:shadow-[0_0_16px_rgba(183,94,24,0.35)]"
              style={{ background: 'linear-gradient(135deg, #B75E18 0%, #1E3054 100%)' }}
            >
              <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <Smartphone className="relative h-4 w-4" strokeWidth={2} />
              <span className="relative">Browse Apps</span>
              <ChevronRight className="relative h-4 w-4" strokeWidth={2} />
            </div>
          </div>
        </div>
      </Link>

      <MyMeals onRelog={loadMealCount} />

      <NutritionInsights mealsLoggedToday={mealsToday} score={score} />

      <MealHistory />
    </div>
    </div>
    </>
  );
}
