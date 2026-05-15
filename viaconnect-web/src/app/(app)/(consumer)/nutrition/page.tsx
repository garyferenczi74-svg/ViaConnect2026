'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Apple, Camera, ChevronRight, Dna, PenLine, ArrowRight, Plus, Smartphone, Upload } from 'lucide-react';
import { NutritionScoreCard } from '@/components/nutrition/NutritionScoreCard';
// Prompt #168: Quick Log tab now opens the 8-slider grams modal (Protein, Carbs,
// Fat Total, Healthy Fat, Fiber, Sugar, Sodium, Calories) instead of the legacy
// 5-slider scroll-score widget. Same QuickLogModal mounted on the dashboard.
import { QuickLogModal, type QuickLogDraft } from '@/components/meals/QuickLogModal';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import { generateTargets } from '@/lib/gordon/generateTargets';
import { NutritionInsights } from '@/components/nutrition/NutritionInsights';
import { MealHistory } from '@/components/nutrition/MealHistory';
import { MyMeals } from '@/components/nutrition/MyMeals';
import { ConnectedAppMealDropdown } from '@/components/nutrition/ConnectedAppMealDropdown';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';
import { NutritionTabs, useNutritionActiveTab, useSetNutritionTab } from '@/components/nutrition/NutritionTabs';
import { DailyTotalsTab } from '@/components/nutrition/DailyTotalsTab';

const NUTRITION_TAB_DEFS = [
  { id: 'log', label: 'Log a Meal' },
  { id: 'daily-totals', label: 'Daily Totals' },
  { id: 'history', label: 'History', disabled: true },
] as const;

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
  const [tab, setTab] = useState<'quick' | 'photo' | 'manual'>('quick');
  const [userId, setUserId] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const activeTab = useNutritionActiveTab(NUTRITION_TAB_DEFS, 'log');
  const setActiveTab = useSetNutritionTab();

  const { targets: prompt168Targets } = useNutritionTargets(userId);
  // USDA fallback targets when no nutrition_targets row exists yet (pre-CAQ).
  // Same pattern as the dashboard mount so the modal opens cleanly for new users.
  const effectiveTargets = useMemo(() => (
    prompt168Targets ?? generateTargets({ caqSnapshot: null, bodySnapshot: null, bioOptDay: null, mealPatternHistory: null })
  ), [prompt168Targets]);

  const loadMealCount = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
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

  const handleQuickLogSave = useCallback(async (draft: QuickLogDraft) => {
    if (!userId) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('meals').insert({
      user_id: userId,
      logged_at: draft.loggedAt,
      meal_type: draft.mealType,
      source: draft.source,
      source_confidence: draft.sourceConfidence,
      protein_g: draft.proteinG,
      carbs_g: draft.carbsG,
      fat_total_g: draft.fatTotalG,
      fat_healthy_g: draft.fatHealthyG,
      fiber_g: draft.fiberG,
      sugar_g: draft.sugarG,
      sodium_mg: draft.sodiumMg,
      calories_kcal: draft.caloriesKcal,
      calories_auto_calc: draft.caloriesAutoCalc,
      whole_food_flag: draft.wholeFoodFlag,
      meal_name: draft.mealName,
      raw_input: draft.rawInput,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[QuickLog insert failed]', error.message);
      return;
    }
    setQuickLogOpen(false);
    loadMealCount();
  }, [userId]);

  // Prompt #160: 'photo' and 'manual' became dedicated routes
  // (/nutrition/photo-ai and /nutrition/log-meal) with the new Gordan AI
  // macro pipeline. 'quick' remains in-page for the legacy meal_logs flow.
  const TABS: Array<{
    id: 'quick' | 'photo' | 'manual';
    label: string;
    icon: typeof Apple;
    gradient: string;
    glow: string;
    href?: string;
  }> = [
    { id: 'quick',  label: 'Quick Log',     icon: Apple,  gradient: 'linear-gradient(135deg, #27AE60 0%, #1E3054 100%)', glow: 'rgba(39,174,96,0.35)' },
    { id: 'photo',  label: 'Photo AI',      icon: Camera, gradient: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)', glow: 'rgba(45,165,160,0.35)', href: '/nutrition/photo-ai' },
    { id: 'manual', label: 'Log Full Meal', icon: PenLine, gradient: 'linear-gradient(135deg, #B75E18 0%, #1E3054 100%)', glow: 'rgba(183,94,24,0.35)', href: '/nutrition/log-meal' },
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

      <NutritionTabs tabs={NUTRITION_TAB_DEFS} defaultTab="log" />

      {activeTab === 'daily-totals' && (
        <DailyTotalsTab onGoToLog={() => setActiveTab('log')} />
      )}

      {activeTab === 'log' && (
      <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Log a Meal</h3>

        <div className="mb-4">
          <ConnectedAppMealDropdown />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            const baseClassName = `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-all no-underline ${
              isActive ? 'opacity-100' : 'opacity-55 hover:opacity-85'
            }`;
            const baseStyle = { background: t.gradient, boxShadow: isActive ? `0 0 12px ${t.glow}` : undefined };
            if (t.href) {
              return (
                <Link key={t.id} href={t.href} className={baseClassName} style={baseStyle}>
                  <Icon className="h-3 w-3" strokeWidth={1.5} />
                  {t.label}
                </Link>
              );
            }
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={baseClassName}
                style={baseStyle}
              >
                <Icon className="h-3 w-3" strokeWidth={1.5} />
                {t.label}
              </button>
            );
          })}
          <Link
            href="/plugins/apps"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white opacity-85 transition-all hover:opacity-100 hover:shadow-[0_0_12px_rgba(107,114,128,0.35)] no-underline"
            style={{ background: 'linear-gradient(135deg, #6B7280 0%, #1E3054 100%)' }}
          >
            <Smartphone className="h-3 w-3" strokeWidth={1.5} />
            Connect a Nutrition App
          </Link>
        </div>

        {tab === 'quick' && (
          <div className="rounded-xl border border-white/10 bg-[#0D1520]/40 p-5 text-center">
            <p className="mb-1 text-sm font-semibold text-white">Quick Log a Meal</p>
            <p className="mb-4 text-xs leading-relaxed text-white/55">
              Log macros in grams across 8 nutrients. Gordon scores the meal against your personalized targets.
            </p>
            <button
              type="button"
              onClick={() => setQuickLogOpen(true)}
              disabled={!userId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#258A85] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Open Quick Log
            </button>
          </div>
        )}
      </div>
      )}

      {/* Prompt #168: 8-slider grams modal mount. Always rendered; userId-gated */}
      {/* button above opens it. onSave inserts into meals + refreshes count. */}
      <QuickLogModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        onSave={handleQuickLogSave}
        targets={effectiveTargets}
      />

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
