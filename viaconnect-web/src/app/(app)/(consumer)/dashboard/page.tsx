'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BOSCard } from '@/components/dashboard/bos-card';
import { TodaysProtocol } from '@/components/dashboard/TodaysProtocol';
import { WellnessSnapshot } from '@/components/dashboard/WellnessSnapshot';
import { DailyScoresPanel } from '@/components/dashboard/DailyScoresPanel';
import { HelixRewardsSummary } from '@/components/dashboard/HelixRewardsSummary';
import { DailyInsightsCard } from '@/components/dashboard/DailyInsightsCard';
import { PatternCirclePreview } from '@/components/community/PatternCirclePreview';
import { ConnectCard } from '@/components/dashboard/ConnectCard';
import { DashboardLinkCard } from '@/components/dashboard/DashboardLinkCard';
import { DailyCheckIn } from '@/components/dashboard/DailyCheckIn';
// Prompt 168 dashboard tiles + Quick Log modal mount.
// QuickMealLogWidget removed: superseded by QuickLogModal (8-slider grams) per
// Gary's directive 2026-05-14 to make the new modal the single Quick Log surface.
import { useUserMeals } from '@/hooks/useUserMeals';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import { TodaysMealsSummary } from '@/components/dashboard/TodaysMealsSummary';
import { DailyMacroRings } from '@/components/dashboard/DailyMacroRings';
import { AverageQualityScoreTile } from '@/components/dashboard/AverageQualityScoreTile';
import { QuickLogModal, type QuickLogDraft } from '@/components/meals/QuickLogModal';
import { generateTargets } from '@/lib/gordon/generateTargets';
import { createClient } from '@/lib/supabase/client';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';
import { RefreshCw, FileQuestion, Plus } from 'lucide-react';

// Pre-uploaded hero image (Hero Images bucket — already public, full URL)
const DASHBOARD_HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2012.png';
const DASHBOARD_HERO_IMAGE_MOBILE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Athlete%2012%20Mobile.png';

/* ── Skeleton ───────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6">
        <div className="h-12 w-2/3 animate-pulse rounded-xl bg-white/5" />
        <div className="h-[300px] animate-pulse rounded-3xl bg-white/5" />
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="h-[400px] animate-pulse rounded-2xl bg-white/5" />
          <div className="h-[400px] animate-pulse rounded-2xl bg-white/5" />
        </div>
        <div className="h-[180px] animate-pulse rounded-2xl bg-white/5" />
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="h-[300px] animate-pulse rounded-2xl bg-white/5" />
          <div className="h-[300px] animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function ConsumerDashboard() {
  const {
    loading,
    userId,
    profile,
    supplements,
    adherence,
    helixBalance,
    streak,
    assessmentCompleted,
  } = useUserDashboardData();

  // Prompt 168 dashboard tiles: meals + targets feed for new section.
  // Both hooks return safe defaults on null userId so initial render is clean.
  const { meals: prompt168Meals } = useUserMeals(userId, { days: 7, includeLegacy: true });
  const { targets: prompt168Targets } = useNutritionTargets(userId);

  // USDA fallback when no nutrition_targets row exists yet (pre-CAQ users).
  // Lets the QuickLogModal always open and score against generic adult
  // defaults; useNutritionTargets will swap to personalized targets once
  // CAQ + Gordon target generation populates a real row.
  const effectiveTargets = useMemo(() => (
    prompt168Targets
    ?? generateTargets({ caqSnapshot: null, bodySnapshot: null, bioOptDay: null, mealPatternHistory: null })
  ), [prompt168Targets]);

  // Prompt 168 Quick Log modal state.
  const [quickLogOpen, setQuickLogOpen] = useState(false);
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
    // useUserMeals realtime auto-updates the tiles below.
  }, [userId]);

  // Saved check-in data (after submit button pressed)
  const [checkinRaw, setCheckinRaw] = useState<Record<string, any> | null>(null);
  // Live preview data (updates as sliders move, before submit)
  const [previewRaw, setPreviewRaw] = useState<Record<string, any> | null>(null);


  // Called when user saves a card (raw slider state, not pre-computed scores)
  const handleCheckinScores = useCallback((rawState: Record<string, any>) => {
    setCheckinRaw((prev) => ({ ...(prev ?? {}), ...rawState, _ts: Date.now() }));
    setPreviewRaw(null);
  }, []);

  // Called on every slider change (live preview, no DB write)
  const handleSliderPreview = useCallback((sliderState: Record<string, any>) => {
    setPreviewRaw({ ...sliderState, _ts: Date.now() });
  }, []);

  if (loading) return <DashboardSkeleton />;

  const helixPoints = helixBalance?.current_balance ?? 0;
  const currentStreak = streak?.current_count ?? 0;
  const longestStreak = streak?.longest_count ?? 0;

  return (
    // ── Full-page fixed background (Prompt #62L sonar pattern, migrated to
    // ── Next.js Image via MobileHeroBackground for reliable object-cover
    // ── on all viewports — replaces CSS bg-fixed + bg-cover that left a
    // ── frame on browsers where background-attachment: fixed misbehaves.
    <>
    <MobileHeroBackground
      src={DASHBOARD_HERO_IMAGE}
      mobileSrc={DASHBOARD_HERO_IMAGE_MOBILE}
      overlayOpacity={0.35}
      priority
      objectPosition="center 45%"
    />

    <div className="relative z-10 min-h-screen w-full text-white">
      {/* Shadow filter lives on the fixed hero (via MobileHeroBackground's
          built-in overlay) so it scales with the image and never extends
          past its bounds; no scrolling page-level gradient to avoid the
          bordering effect where the inner-div overlay outran the hero. */}
      <div className="min-h-screen">

        {/* ── Tagline — image fully visible ── */}
        <div className="w-full px-4 pt-14 pb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
            Your Personal Wellness Journey
          </h1>
          <p className="mt-2 text-sm text-white/90 md:text-base">
            Powered by your data Guided by your goals
          </p>
        </div>

        {/* ── Greeting — image visible ── */}
        <div className="mx-auto w-full max-w-7xl px-4 mb-4 md:px-6">
          <DashboardHeader />
        </div>

        {/* ── Bio Optimization Score Card (Prompt #162) ── */}
        <div className="mx-auto w-full max-w-7xl px-4 mb-8 md:px-6">
          <BOSCard />
        </div>

        {/* ── All remaining content — image fades as overlay darkens ── */}
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 md:px-6">
        {/* ── 3. Daily Scores Grid (Personal Wellness Dashboard) ── */}
        <DailyScoresPanel checkinRaw={checkinRaw} previewRaw={previewRaw} />

        {/* ── 3b. Daily Check-In (Prompt #62e — Tier 4 manual input) ── */}
        <DailyCheckIn onScoresUpdate={handleCheckinScores} onSliderChange={handleSliderPreview} />

        {/* Prompt 168 dashboard tiles: Today's Nutrition section. */}
        {/* Each tile renders a safe empty state when userId or targets unavailable. */}
        {/* DailyMacroRings only mounts when targets row exists; no flicker pre-CAQ. */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold uppercase tracking-[0.10em] text-white/55">
              Today&apos;s Nutrition
            </h2>
            <button
              type="button"
              onClick={() => setQuickLogOpen(true)}
              disabled={!userId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#258A85] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Log Meal
            </button>
          </div>
          <TodaysMealsSummary meals={prompt168Meals} />
          <DailyMacroRings meals={prompt168Meals} targets={effectiveTargets} />
          <AverageQualityScoreTile meals={prompt168Meals} days={7} />
        </section>

        {/* Prompt 168 Quick Log modal mount. Always renders; uses USDA fallback */}
        {/* targets when no personalized nutrition_targets row exists yet. onSave  */}
        {/* inserts into meals; useUserMeals realtime auto-refreshes the tiles.  */}
        <QuickLogModal
          open={quickLogOpen}
          onClose={() => setQuickLogOpen(false)}
          onSave={handleQuickLogSave}
          targets={effectiveTargets}
        />

        {/* ── 4. Today's Protocol + (Wellness Snapshot / Helix Rewards stack) ── */}
        <div className="grid items-stretch gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex h-full min-w-0 flex-col gap-5">
            {/* Today's Protocol grows to fill leftover space so the column
                bottom aligns with the right column's Connect App tab */}
            <div className="flex min-w-0 flex-1 flex-col">
              <TodaysProtocol supplements={supplements} />
            </div>
            <DashboardLinkCard
              eyebrow="Health Profile"
              eyebrowIcon={FileQuestion}
              title="Update Your Assessment"
              description="Refresh your CAQ answers so Hannah can refine your protocol based on your latest symptoms, medications, and goals."
              icon={RefreshCw}
              accent="#B75E18"
              href="/onboarding/i-caq-intro"
              cta="Update Assessment"
            />
          </div>
          <div className="flex h-full min-w-0 flex-col gap-5">
            {/* Wellness Snapshot is desktop-only per spec */}
            <div className="hidden lg:block">
              <WellnessSnapshot autoFetch={assessmentCompleted} />
            </div>
            <HelixRewardsSummary
              totalPoints={helixPoints}
              currentStreak={currentStreak}
              longestStreak={longestStreak}
            />
            {/* Connect device / app cards — full-width, matching tab design */}
            <ConnectCard type="wearable" href="/plugins/wearables" />
            <ConnectCard type="app" href="/plugins/apps" />
          </div>
        </div>

        {/* ── Daily Insights (Prompt #61, replaces DailyUltrathinkTip) ── */}
        <DailyInsightsCard profile={profile} supplements={supplements} />

        <PatternCirclePreview
          userPatterns={['HPA Axis Dysregulation', 'Methylation Pathway']}
        />
        </div>
      </div>
    </div>
    </>
  );
}
