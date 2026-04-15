'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BioOptimizationGauge } from '@/components/dashboard/BioOptimizationGauge';
import { TodaysProtocol } from '@/components/dashboard/TodaysProtocol';
import { WellnessSnapshot } from '@/components/dashboard/WellnessSnapshot';
import { DailyScoresPanel } from '@/components/dashboard/DailyScoresPanel';
import { HelixRewardsSummary } from '@/components/dashboard/HelixRewardsSummary';
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';
import { DailyInsightsCard } from '@/components/dashboard/DailyInsightsCard';
import { QuickReassessmentCard } from '@/components/dashboard/QuickReassessmentCard';
import { PatternCirclePreview } from '@/components/community/PatternCirclePreview';
import { ConnectCard } from '@/components/dashboard/ConnectCard';
import { DashboardLinkCard } from '@/components/dashboard/DashboardLinkCard';
import { DailyCheckIn } from '@/components/dashboard/DailyCheckIn';
import { QuickMealLogWidget } from '@/components/dashboard/QuickMealLogWidget';
import { RefreshCw, FileQuestion } from 'lucide-react';

// Pre-uploaded hero image (Hero Images bucket — already public, full URL)
const DASHBOARD_HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Hero%20lake%20workout.png';

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

/* ── Tier helpers ───────────────────────────────────────────── */
const tierMultiplier = (tier: string | null): number => {
  const t = (tier || '').toLowerCase();
  if (t.includes('platinum')) return 5;
  if (t.includes('diamond')) return 5;
  if (t.includes('gold')) return 2;
  if (t.includes('silver')) return 1.5;
  return 1;
};

/* ── Page ───────────────────────────────────────────────────── */
export default function ConsumerDashboard() {
  const {
    loading,
    profile,
    supplements,
    adherence,
    bioHistory,
    helixBalance,
    streak,
    assessmentCompleted,
  } = useUserDashboardData();

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

  const bioScore = profile?.bio_optimization_score ?? 0;
  const bioTier = profile?.bio_optimization_tier || 'Bronze';

  // Weekly delta = current score − score ~7 entries ago
  const weeklyDelta = (() => {
    if (bioHistory.length < 2) return 0;
    const latest = bioHistory[bioHistory.length - 1].score;
    const weekAgo =
      bioHistory.length >= 8
        ? bioHistory[bioHistory.length - 8].score
        : bioHistory[0].score;
    return Math.round(latest - weekAgo);
  })();

  const helixPoints = helixBalance?.current_balance ?? 0;
  const currentStreak = streak?.current_count ?? 0;
  const longestStreak = streak?.longest_count ?? 0;

  const daysSinceCAQ = profile?.caq_completed_at
    ? Math.floor(
        (Date.now() - new Date(profile.caq_completed_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    // ── Full-page fixed background (Prompt #62L — true Sonar pattern) ──
    <div
      className="min-h-screen w-full bg-contain bg-top bg-no-repeat bg-scroll text-white md:bg-cover md:bg-[position:center_45%] md:bg-fixed"
      style={{ backgroundImage: `url('${DASHBOARD_HERO_IMAGE}')` }}
    >
      {/* Progressive overlay: lightest at top (image breathes), solid navy at bottom */}
      <div className="min-h-screen bg-gradient-to-b from-[rgba(10,15,35,0.30)] via-[rgba(26,39,68,0.60)] to-[rgba(26,39,68,0.95)]">

        {/* ── Tagline — image fully visible ── */}
        <div className="w-full px-4 pt-14 pb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
            Your Personal Wellness Journey
          </h1>
          <p className="mt-2 text-sm text-white/65 md:text-base">
            Powered by your data; guided by your goals
          </p>
        </div>

        {/* ── Greeting — image visible ── */}
        <div className="mx-auto w-full max-w-7xl px-4 mb-4 md:px-6">
          <DashboardHeader />
        </div>

        {/* ── Bio Optimization Gauge — semi-transparent card over image ── */}
        <div className="mx-auto w-full max-w-7xl px-4 mb-8 md:px-6">
          <BioOptimizationGauge
            score={bioScore}
            tier={bioTier}
            tierMultiplier={tierMultiplier(bioTier)}
            hasCAQ={assessmentCompleted}
            hasLabs={false}
            hasGenetics={false}
            weeklyDelta={weeklyDelta}
          />
        </div>

        {/* ── All remaining content — image fades as overlay darkens ── */}
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 md:px-6">
        {/* ── 3. Daily Scores Grid (Personal Wellness Dashboard) ── */}
        <DailyScoresPanel checkinRaw={checkinRaw} previewRaw={previewRaw} />

        {/* ── 3b. Daily Check-In (Prompt #62e — Tier 4 manual input) ── */}
        <DailyCheckIn onScoresUpdate={handleCheckinScores} onSliderChange={handleSliderPreview} />

        {/* ── 3c. Quick Meal Log (Prompt #62f — 4 meal slots) ── */}
        <QuickMealLogWidget />

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
              description="Refresh your CAQ answers so Ultrathink™ can refine your protocol based on your latest symptoms, medications, and goals."
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

        {/* ── 5. Quick Actions ─────────────────────────────── */}
        <QuickActionsGrid />

        {/* ── Daily Insights (Prompt #61, replaces DailyUltrathinkTip) ── */}
        <DailyInsightsCard profile={profile} supplements={supplements} />

        <QuickReassessmentCard daysElapsed={daysSinceCAQ || 0} />

        <PatternCirclePreview
          userPatterns={['HPA Axis Dysregulation', 'Methylation Pathway']}
        />
        </div>
      </div>
    </div>
  );
}
