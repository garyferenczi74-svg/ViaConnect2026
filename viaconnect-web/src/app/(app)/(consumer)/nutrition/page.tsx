'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Camera, ChevronRight, Dna, PenLine, Smartphone, Upload } from 'lucide-react';
import { NutritionScoreCard } from '@/components/nutrition/NutritionScoreCard';
// Prompt #168c section 2.4: channel row cleanup. Quick Log is on the Dashboard
// surface only (#168c section 2.1). The /nutrition Log a Meal tab now lists
// three gradient pill buttons: Log Full Meal, Photo AI, Connect Your App, each
// navigating to its dedicated route. The Open Quick Log CTA card and the
// orange-outlined reminder banner are removed entirely.
import { NutritionInsights } from '@/components/nutrition/NutritionInsights';
import { MealHistory } from '@/components/nutrition/MealHistory';
import { MyMeals } from '@/components/nutrition/MyMeals';
import { ConnectedAppMealDropdown } from '@/components/nutrition/ConnectedAppMealDropdown';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';
import { DailyTotalsTab } from '@/components/nutrition/DailyTotalsTab';

// Prompt #169 followup per Gary 2026-05-15: Log a Meal / Daily Totals / History
// tab strip removed. Both the Log a Meal section and the Daily Totals section
// render stacked on the page so users see everything in one scroll.
// History is still disabled and not rendered here.

const NUTRITION_HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Food%203.png';

export default function NutritionPage() {
  return (
    <Suspense fallback={<div className="h-12" />}>
      <NutritionPageInner />
    </Suspense>
  );
}

function NutritionPageInner() {
  const [mealsToday, setMealsToday] = useState(0);
  const [score, setScore] = useState(0);

  const loadMealCount = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Prompt #168c section 2.4: three gradient pill channel buttons. Log Full
  // Meal LEFTMOST as primary. All three navigate to dedicated routes; no
  // in-page tab content remains here.
  const TABS: ReadonlyArray<{
    id: string;
    label: string;
    icon: typeof Camera;
    href: string;
  }> = [
    { id: 'manual', label: 'Log Full Meal', icon: PenLine, href: '/nutrition/log-meal' },
    { id: 'photo', label: 'Photo AI', icon: Camera, href: '/nutrition/photo-ai' },
    { id: 'connect', label: 'Connect Your App', icon: Smartphone, href: '/plugins/apps' },
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

      <NutritionScoreCard />

      {/* Log a Meal section: ConnectedAppMealDropdown + 3 channel buttons. */}
      <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Log a Meal</h3>

        <div className="mb-4">
          <ConnectedAppMealDropdown />
        </div>

        {/* Prompt #168c section 2.4: three gradient pill buttons in a single */}
        {/* row at md and above, stacked vertically below md. Quick Log lives */}
        {/* on the Dashboard surface only; Open Quick Log CTA card removed. */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={t.href}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white no-underline transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(90deg, #2DA5A0 0%, #B75E18 100%)' }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Daily Totals section: stacked under Log a Meal per Gary 2026-05-15. */}
      {/* No tab strip; both render in document flow. onGoToLog scrolls user */}
      {/* up to the channel buttons since they live above this section now. */}
      <DailyTotalsTab onGoToLog={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

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

      <MyMeals onRelog={loadMealCount} />

      <NutritionInsights mealsLoggedToday={mealsToday} score={score} />

      <MealHistory />
    </div>
    </div>
    </>
  );
}
