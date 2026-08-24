'use client';

import { useState, useCallback } from 'react';
import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BOSCard } from '@/components/dashboard/bos-card';
import { TodaysProtocol } from '@/components/dashboard/TodaysProtocol';
import { WellnessSnapshot } from '@/components/dashboard/WellnessSnapshot';
import { DailyScoresPanel } from '@/components/dashboard/DailyScoresPanel';
import { EngagementNudge } from '@/components/dashboard/EngagementNudge';
import type { EngagementNudge as Nudge } from '@/lib/scoring/engagementNudges';
import { HelixRewardsSummary } from '@/components/dashboard/HelixRewardsSummary';
import { DailyInsightsCard } from '@/components/dashboard/DailyInsightsCard';
// Prompt 219e: Quick Log removed. Dashboard Log Your Meal is a window into
// My Nutrition (shared actions, Today's Meals, Daily Macros). Hydration FAB
// remains retired; Hydration is one of the three shared Log Your Meal actions.
import { PatternCirclePreview } from '@/components/community/PatternCirclePreview';
import { ConnectCard } from '@/components/dashboard/ConnectCard';
import { DashboardLinkCard } from '@/components/dashboard/DashboardLinkCard';
import { DailyCheckIn } from '@/components/dashboard/DailyCheckIn';
import { DashboardLogYourMealSection } from '@/components/dashboard/DashboardLogYourMealSection';
import { MobileHeroVideoBackground } from '@/components/ui/MobileHeroVideoBackground';
import { RefreshCw, FileQuestion } from 'lucide-react';

// Dashboard hero video: 16x9 master for landscape frame fill. PNG poster for first paint.
const DASHBOARD_HERO_VIDEO =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Athlete%2012%2016x9%20MP4.mp4';
const DASHBOARD_HERO_POSTER =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2012.png';

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

  // Prompt 180g (2026-06-08): nudge surfaced by DailyScoresPanel.
  // Rendered below the Daily Check-In card instead of inline above
  // it. Null while the panel is loading or empty.
  const [engagementNudge, setEngagementNudge] = useState<Nudge | null>(null);

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
    // Full-page fixed hero video (Athlete 12 MP4). Poster is the prior still
    // for first paint and reduced-motion pause. Overlay scrim keeps copy legible.
    <>
    <MobileHeroVideoBackground
      src={DASHBOARD_HERO_VIDEO}
      poster={DASHBOARD_HERO_POSTER}
      overlayOpacity={0.35}
      // 16x9 source matches desktop frame; cover fills without portrait letterbox.
      objectFit="cover"
      objectPosition="center top"
    />

    <div className="relative z-10 min-h-screen w-full text-white">
      {/* Shadow filter lives on the fixed hero video overlay so it scales with
          the footage and never extends past its bounds. */}
      <div className="min-h-screen">

        {/* Tagline, image fully visible */}
        <div className="w-full px-4 pt-14 pb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
            Your Personal Wellness Journey
          </h1>
          <p className="mt-2 text-sm text-white/90 md:text-base">
            Powered by your data Guided by your goals
          </p>
        </div>

        {/* Greeting, image visible */}
        <div className="mx-auto w-full max-w-7xl px-4 mb-4 md:px-6">
          <DashboardHeader />
        </div>

        {/* ── Bio Optimization Score Card (Prompt #162) ── */}
        <div className="mx-auto w-full max-w-7xl px-4 mb-8 md:px-6">
          <BOSCard />
        </div>

        {/* All remaining content, image fades as overlay darkens */}
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 md:px-6">
        {/* ── 3. Daily Scores Grid (Personal Wellness Dashboard) ── */}
        <DailyScoresPanel
          checkinRaw={checkinRaw}
          previewRaw={previewRaw}
          onNudge={setEngagementNudge}
        />

        {/* 3b. Daily Check-In (Prompt #62e, Tier 4 manual input) */}
        <DailyCheckIn onScoresUpdate={handleCheckinScores} onSliderChange={handleSliderPreview} />

        {/* Prompt 180g (2026-06-08): Engagement nudge (e.g. "No
            exercise logged yet ...") moved down here, below the
            Quick Daily Check-In card. The panel above emits the
            nudge through onNudge whenever scores load. */}
        {engagementNudge && <EngagementNudge nudge={engagementNudge} />}

        {/* Prompt 219e: Log Your Meal (shared My Nutrition actions + Today's Meals + Daily Macros). Quick Log removed. */}
        <DashboardLogYourMealSection userId={userId} />

        {/* ── 4. Today's Protocol + (Wellness Snapshot / Helix Rewards stack) ── */}
        <div className="grid items-stretch gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex h-full min-w-0 flex-col gap-5">
            {/* Today's Protocol grows to fill leftover space so the column
                bottom aligns with the right column's Connect App tab */}
            <div className="flex min-w-0 flex-1 flex-col">
              <TodaysProtocol supplements={supplements} />
            </div>
          </div>
          <div className="flex h-full min-w-0 flex-col gap-5">
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
            {/* Wellness Snapshot is desktop-only per spec */}
            <div className="hidden lg:block">
              <WellnessSnapshot autoFetch={assessmentCompleted} />
            </div>
            <HelixRewardsSummary
              totalPoints={helixPoints}
              currentStreak={currentStreak}
              longestStreak={longestStreak}
            />
            {/* Connect device / app cards, full-width matching tab design */}
            <ConnectCard type="wearable" href="/body-tracker/connections" />
            <ConnectCard type="app" href="/plugins/apps" />
          </div>
        </div>

        {/* Prompt 219e: hydration entry is the Hydration action under Log Your Meal
            (shared with My Nutrition), routing to /wellness-analytics/hydration. */}

        {/* Daily Insights (Prompt #61, replaces DailyUltrathinkTip) */}
        <DailyInsightsCard profile={profile} supplements={supplements} />

        <PatternCirclePreview userPatterns={[]} />
        </div>
      </div>
    </div>
    {/* Prompt 175 (2026-06-05): HydrationFloatingActionButton render removed. */}
    </>
  );
}
