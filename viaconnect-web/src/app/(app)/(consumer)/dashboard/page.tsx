'use client';

// Consumer Dashboard — Prompt #56 refresh.
// 5 primary sections (Hero gauge → Today's Protocol + Wellness Snapshot →
// Daily Scores → Helix Rewards + Quick Actions). Existing Ultrathink Tip,
// Quick Reassessment, and Pattern Circles are preserved below as extras.

import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BioOptimizationGauge } from '@/components/dashboard/BioOptimizationGauge';
import { TodaysProtocol } from '@/components/dashboard/TodaysProtocol';
import { WellnessSnapshot } from '@/components/dashboard/WellnessSnapshot';
import { DailyScoresGrid } from '@/components/dashboard/DailyScoresGrid';
import { HelixRewardsSummary } from '@/components/dashboard/HelixRewardsSummary';
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';
import { DailyInsightsCard } from '@/components/dashboard/DailyInsightsCard';
import { QuickReassessmentCard } from '@/components/dashboard/QuickReassessmentCard';
import { PatternCirclePreview } from '@/components/community/PatternCirclePreview';
import { ConnectCard } from '@/components/dashboard/ConnectCard';
import { DashboardLinkCard } from '@/components/dashboard/DashboardLinkCard';
import FixedHeroBackground from '@/components/ui/FixedHeroBackground';
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
    <div className="min-h-screen w-full text-white">
      {/* ── Fixed Hero Background (Prompt #62 — scroll-over pattern) ── */}
      <FixedHeroBackground
        imagePath={DASHBOARD_HERO_IMAGE}
        overlayOpacity={0.45}
        alt="Personal wellness dashboard background"
      />

      {/* ── Transparent hero zone — image visible through here ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 pb-10 text-center md:px-6 md:pt-12 md:pb-16">
        <h2 className="font-instrument-sans text-2xl font-bold leading-tight text-white drop-shadow-md sm:text-3xl md:text-4xl lg:text-5xl">
          Your Personal Wellness Journey
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/85 drop-shadow sm:text-base md:max-w-xl md:text-lg">
          Powered by your data · guided by your goals
        </p>
      </div>

      {/* ── Content scrolls over the fixed image (Sonar pattern — no solid bg) ── */}
      <div className="relative z-10 -mt-2 min-h-screen rounded-t-3xl pb-24">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        {/* ── 1. Header ────────────────────────────────────── */}
        <DashboardHeader />

        {/* ── 2. Bio Optimization Gauge (Hero) ─────────────── */}
        <BioOptimizationGauge
          score={bioScore}
          tier={bioTier}
          tierMultiplier={tierMultiplier(bioTier)}
          hasCAQ={assessmentCompleted}
          hasLabs={false}
          hasGenetics={false}
          weeklyDelta={weeklyDelta}
        />

        {/* ── 3. Daily Scores Grid (Personal Wellness Dashboard) ── */}
        <DailyScoresGrid
          bioHistory={bioHistory}
          adherence={adherence}
          currentStreak={currentStreak}
        />

        {/* ── 4. Today's Protocol + (Wellness Snapshot / Helix Rewards stack) ── */}
        <div className="grid items-stretch gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex h-full flex-col gap-5">
            {/* Today's Protocol grows to fill leftover space so the column
                bottom aligns with the right column's Connect App tab */}
            <div className="flex flex-1 flex-col">
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
          <div className="flex h-full flex-col gap-5">
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
