'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Camera, ChevronRight, Dna, PenLine, Smartphone, Upload, X } from 'lucide-react';
import { NutritionScoreCard } from '@/components/nutrition/NutritionScoreCard';
import { DailyMacrosCard } from '@/components/nutrition/DailyMacrosCard';
import { useNutrivisionManualLogHandoff } from '@/hooks/useNutrivisionManualLogHandoff';
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
import { RecipesLibrarySection } from '@/components/recipes/RecipesLibrarySection';

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
  // #170a supplement §20.D + Deviation B: if the user bounced here from a
  // NutriVision Log-Manually click, surface a banner inviting them to open a
  // Quick Log pill below. The handoff carries the source_photo_blob_id so the
  // dashboard Quick Log save POST can attach it once the user saves.
  const { handoff, clearHandoff } = useNutrivisionManualLogHandoff();

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

  // Prompt #168c section 2.4 + Prompt 173b: three gradient pill channel
  // buttons restored. "Log Full Meal" LEFTMOST routes to the text-description
  // editor at /nutrition/log-meal; Prompt 173b lifted the 168c/168d unscored
  // lock on that path so meals saved there now run through Gordon scoring +
  // BOS recompute and surface their score on Today's Meals + Daily Macros +
  // Dashboard Nutrition gauge. NutriVision is the photo/barcode/voice scored
  // hub; Connect Your App pairs an integration.
  // Accent + hover-shadow RGB per channel matches the NutrigenDX reference
  // pattern below (See NutrigenDX Results / Upload Nutrition Test / Review
  // Nutrition Results): linear-gradient(135deg, <accent>, #1E3054) plus a
  // colored glow on hover.
  const TABS: ReadonlyArray<{
    id: string;
    label: string;
    icon: typeof Camera;
    href: string;
    accent: string;
    hoverRgb: string;
  }> = [
    { id: 'manual',  label: 'Log Full Meal',    icon: PenLine,    href: '/nutrition/log-meal', accent: '#2DA5A0', hoverRgb: '45,165,160' },
    { id: 'photo',   label: 'NutriVision',      icon: Camera,     href: '/nutrition/photo-ai', accent: '#2DA5A0', hoverRgb: '45,165,160' },
    { id: 'connect', label: 'Connect Your App', icon: Smartphone, href: '/plugins/apps',       accent: '#27AE60', hoverRgb: '39,174,96' },
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

      {/* Gary 2026-06-03: Daily Macros lifted out of the lower DailyTotalsTab */}
      {/* so the rings sit directly under Nutrition Score; Today's Meals (with */}
      {/* the Hydration accordion) stays in DailyTotalsTab further down. */}
      <DailyMacrosCard />

      {/* #170a supplement §20.D banner: surfaces only when the user arrived
          here via NutriVision's Log-Manually CTA. Quick Logs live on the
          dashboard; this banner sets expectation that the user's photo is
          attached and tapping a meal-type pill (on the Dashboard, surfaced
          via Quick Logs) will carry the attachment along. */}
      {handoff && (
        <div className="rounded-xl border border-[#2DA5A0]/40 bg-[#1E3054]/55 p-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-relaxed text-white/85">
              Your photo is ready. Tap Breakfast, Lunch, Dinner, or Snack below
              to log this meal manually.
            </p>
            <button
              type="button"
              onClick={clearHandoff}
              aria-label="Discard the attached photo"
              className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={clearHandoff}
            className="mt-3 inline-flex items-center text-xs font-medium text-[#2DA5A0] transition-colors hover:underline"
          >
            Discard photo
          </button>
        </div>
      )}

      {/* Log a Meal section: ConnectedAppMealDropdown + 3 channel buttons. */}
      <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Log a Meal</h3>

        <div className="mb-4">
          <ConnectedAppMealDropdown />
        </div>

        {/* Prompt #168c section 2.4 + Prompt 173b: three gradient pill buttons */}
        {/* in a single row at md and above, stacked vertically below md. The */}
        {/* Log Full Meal pill was reinstated by 173b and now routes to a path */}
        {/* that scores via Gordon, so Today's Meals + Daily Macros + the */}
        {/* Dashboard gauge all pick it up. */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={t.href}
                className="group/cta relative flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white no-underline transition-all hover:shadow-[0_0_16px_rgba(var(--cta-hover-rgb),0.35)] active:scale-[0.97]"
                style={{
                  background: `linear-gradient(135deg, ${t.accent} 0%, #1E3054 100%)`,
                  ['--cta-hover-rgb' as never]: t.hoverRgb,
                }}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover/cta:opacity-100" />
                <Icon className="relative h-4 w-4" strokeWidth={1.5} />
                <span className="relative">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Daily Totals section: stacked under Log a Meal per Gary 2026-05-15. */}
      {/* No tab strip; both render in document flow. onGoToLog scrolls user */}
      {/* up to the channel buttons since they live above this section now. */}
      <DailyTotalsTab onGoToLog={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      {/* Gary 2026-06-03: My Recipes library now sits under Today's Meals */}
      {/* so users see their logged meals first, then pull from the recipe */}
      {/* library. Hidden entirely when NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED */}
      {/* flag is off. */}
      <RecipesLibrarySection />

      {/* Nutrition by Genetics: full-width tab.
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
