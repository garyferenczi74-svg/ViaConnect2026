'use client';

/**
 * src/components/journey/YourJourneyPage.tsx
 *
 * The single-scrolling "Your Journey" page composition for /analytics.
 * Rebuilt by Prompt 208g (Task G-T1) into the COACHING LAYOUT.
 * Supersedes the 208d 8-section SectionShell stack.
 *
 * 208g section order (top to bottom):
 *   3.1 Phase strip        - JourneySpine (keep, flag for Gary)
 *   3.2 Hero               - profile rail (left) + narrative/Hannah/gauges/graph (right)
 *   3.3 Goals/Nutrition/Sleep + Body Composition Trio
 *   3.4 Today + This Week  - TodayStats + VitalTrends (left) + Hannah read (right)
 *   3.5 Accelerators + Connection Map
 *   3.6 Footer disclaimer
 *
 * REUSE: all existing section components mount unchanged (see imports).
 * PLACEHOLDERS: GaugeCluster (G-T2), DailyScoresGraph (G-T3), HannahRead button (G-T5).
 * DROPPED: standalone EnergyStressGraph (208g uses DailyScoresGraph as trend surface).
 *
 * Constraints: no em-dashes, no en-dashes, no emojis. Lucide strokeWidth={1.5}.
 * Full content-frame width (w-full, no max-w cap). Responsive: grid-cols-1 mobile,
 * multi-col on md/lg. Page never throws - all components are fail-open.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Network,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  JourneySelectionProvider,
} from '@/components/journey/JourneySelectionContext';
import { JourneySpine } from '@/components/journey/JourneySpine';
import { ProfileCard } from '@/components/journey/coaching/ProfileCard';
import { NarrativeRead } from '@/components/journey/coaching/NarrativeRead';
import { GaugeCluster } from '@/components/journey/coaching/GaugeCluster';
import { DailyScoresGraph } from '@/components/journey/coaching/DailyScoresGraph';
import { HannahInsightPanel } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/HannahInsightPanel';
import { useBioOptimizationTrend } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';
import { useHannahInsights } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useHannahInsights';
import { GoalProgressCard } from '@/components/journey/progress/GoalProgressCard';
import { BodyCompositionTrio } from '@/components/journey/progress/BodyCompositionTrio';
import { NutritionDonut } from '@/components/journey/trio/NutritionDonut';
import { SleepDonut } from '@/components/journey/trio/SleepDonut';
import { VitalTrends } from '@/components/journey/trio/VitalTrends';
import { getDisplayName } from '@/lib/user/get-display-name';
import { JourneyAcceleratorsSection } from '@/components/journey/accelerators/JourneyAcceleratorsSection';
import { TodayStats } from '@/components/journey/today/TodayStats';
import { ConnectionMap } from '@/components/journey/connections/ConnectionMap';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// ---------------------------------------------------------------------------
// SectionShell: a calm glass-panel wrapper with an optional heading.
//
// Every titled section on the page uses this so spacing, the eyebrow label,
// and the surface treatment stay consistent. The eyebrow is the small mono
// uppercase tag used across the journey surfaces; the title is DM Sans.
// ---------------------------------------------------------------------------

function SectionShell({
  eyebrow,
  title,
  icon: Icon,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass-panel w-full p-4 md:p-5 ${className ?? ''}`}
      aria-label={title ?? eyebrow ?? undefined}
    >
      {(title || eyebrow) && (
        <div className="mb-3 flex items-center gap-2">
          {Icon && (
            <Icon
              className="h-4 w-4 shrink-0"
              strokeWidth={1.5}
              style={{ color: TEAL }}
            />
          )}
          <div className="flex min-w-0 flex-col">
            {eyebrow && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ fontFamily: DM_MONO, color: TEAL }}
              >
                {eyebrow}
              </span>
            )}
            {title && (
              <h2
                className="text-sm font-semibold text-white md:text-base"
                style={{ fontFamily: DM_SANS }}
              >
                {title}
              </h2>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// YourJourneyPage
//
// Data wiring lives here so each layout section below can consume it without
// prop-drilling or re-fetching. The BOS hook is shared (react-query dedupes
// the same queryKey) between the hero narrative and the gauge row.
// ---------------------------------------------------------------------------

export function YourJourneyPage({ userId }: { userId: string | null }) {
  // Fail-open BOS read - same wiring as the old CoachingHeader.
  const { data } = useBioOptimizationTrend(userId, '7D');
  const bioPoints = data?.bioScores ?? [];
  const current = data?.current ?? 0;

  // Honest score for the narrative: null means "getting started" tier rather
  // than a fabricated number at a real tier.
  const narrativeScore =
    typeof current === 'number' && isFinite(current) && current > 0
      ? current
      : null;

  // First name resolved once (fail-open to empty string -> components use
  // their own fallback copy).
  const [displayName, setDisplayName] = useState<string>('');
  useEffect(() => {
    let active = true;
    getDisplayName()
      .then((n) => {
        if (active) setDisplayName(n);
      })
      .catch(() => {
        /* keep empty default */
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // weeksActive: spans the real bio score history, mirroring the trend panel.
  const weeksActive = useMemo(() => {
    if (bioPoints.length === 0) return 0;
    const first = new Date(bioPoints[0].date).getTime();
    const last = new Date(bioPoints[bioPoints.length - 1].date).getTime();
    if (!isFinite(first) || !isFinite(last)) return 0;
    return Math.max(1, Math.round((last - first) / (7 * 24 * 60 * 60 * 1000)));
  }, [bioPoints]);

  // Hannah insight wired identically to the old CoachingHeader and the
  // analytics trend panel. Reused in both the hero and the HannahRead section.
  const insight = useHannahInsights({
    userId,
    displayName,
    range: '7D',
    points: bioPoints,
    current,
    weeksActive,
  });

  return (
    <JourneySelectionProvider>
      <div className="relative z-10 min-h-screen text-white">
        <div className="w-full space-y-5 px-4 py-6 md:px-6 md:py-8">

          {/* ----------------------------------------------------------------
              3.1 PHASE STRIP
              JourneySpine sits at the very top.
              NOTE for Gary: 208g section 3 does not list the phase strip
              explicitly. Kept as a low-risk default. If the coaching mockup
              drops it Gary can remove this line in the next pass.
          ---------------------------------------------------------------- */}
          <JourneySpine userId={userId} />

          {/* ----------------------------------------------------------------
              3.2 HERO
              Two-part responsive grid: profile rail (left) + main column
              (right). Stacks on mobile with profile first.
          ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 items-stretch lg:grid-cols-[300px_1fr]">

            {/* LEFT rail: profile card in a glass panel */}
            <SectionShell eyebrow="Your profile" className="h-full">
              <ProfileCard userId={userId} />
            </SectionShell>

            {/* RIGHT main column: narrative + Hannah + gauges + daily scores */}
            <div className="flex flex-col gap-4">

              {/* Narrative headline + Hannah read note */}
              <SectionShell eyebrow="Your journey" title="Where you stand">
                <div className="flex flex-col gap-3">
                  <NarrativeRead
                    userId={userId}
                    displayName={displayName}
                    score={narrativeScore}
                  />
                  <HannahInsightPanel insight={insight} />
                </div>
              </SectionShell>

              {/* GaugeCluster: G-T2 built. 7 tinted Plasma gauges, one per pillar.
                  PillarGaugeRow.tsx left on disk; no longer imported here. */}
              <SectionShell eyebrow="Pillar scores" title="Your pillars">
                <GaugeCluster userId={userId} />
              </SectionShell>

              {/* DailyScoresGraph: G-T3 built. Multi-line composite trend,
                  range toggle 1W/1M/1Y, pillar legend, honest seed state.
                  Only the Bio Optimization composite line is plotted when
                  history is available. Per-pillar trends have no history
                  source and appear in the legend only. */}
              <SectionShell eyebrow="Trend" title="Daily Scores">
                <DailyScoresGraph userId={userId} />
              </SectionShell>

            </div>
          </div>

          {/* ----------------------------------------------------------------
              3.3 GOALS / NUTRITION / SLEEP + BODY COMPOSITION TRIO
          ---------------------------------------------------------------- */}

          {/* Equal-height 3-card row */}
          <div className="grid grid-cols-1 gap-4 items-stretch md:grid-cols-3">
            <GoalProgressCard userId={userId} />
            <NutritionDonut userId={userId} />
            <SleepDonut userId={userId} />
          </div>

          {/* Body Composition Trio row (G-T4): lean mass, body fat, energy balance.
              BodyCompositionCard.tsx left on disk; imports removed from this page. */}
          <BodyCompositionTrio userId={userId} />

          {/* ----------------------------------------------------------------
              3.4 TODAY + THIS WEEK
              Split row: TodayStats + VitalTrends (left), Hannah read (right).
          ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 items-stretch lg:grid-cols-[1.4fr_1fr]">

            {/* LEFT: today stats stacked over vital trends */}
            <div className="flex flex-col gap-4">
              <TodayStats userId={userId} />
              <VitalTrends userId={userId} />
            </div>

            {/* RIGHT: HannahRead card - equal height (items-stretch on grid),
                inner layout flex-col so the panel grows and the button pins to
                the bottom via mt-auto. G-T5: button is a real Next.js Link to
                the same route HannahInsightPanel uses. Label is the verbatim
                208g 3.3 spec string. */}
            <SectionShell
              eyebrow="Your coach"
              title="Hannah read"
              className="h-full flex flex-col"
            >
              <div className="flex flex-1 flex-col">
                <div className="flex-1">
                  <HannahInsightPanel insight={insight} />
                </div>
                <div className="mt-auto pt-4">
                  <Link
                    href="/wellness/advisor?report=bio-optimization"
                    className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90"
                    style={{
                      fontFamily: DM_SANS,
                      background: 'rgba(45,165,160,0.14)',
                      border: '1px solid rgba(45,165,160,0.35)',
                      color: TEAL,
                    }}
                  >
                    <span>View Full Report with Hannah</span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            </SectionShell>

          </div>

          {/* ----------------------------------------------------------------
              3.5 ACCELERATORS + CONNECTION MAP
              Split row: accelerators (left), connection map (right).
          ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
            <SectionShell eyebrow="What moves you forward" title="Journey accelerators" icon={Sparkles}>
              <JourneyAcceleratorsSection userId={userId} />
            </SectionShell>
            <SectionShell eyebrow="How it connects" title="Connection map" icon={Network}>
              <ConnectionMap />
            </SectionShell>
          </div>

          {/* ----------------------------------------------------------------
              3.6 FOOTER DISCLAIMER
              G-T7 finalizes footer + resilience sweep.
          ---------------------------------------------------------------- */}
          <p
            className="text-center text-xs text-white/30 px-4"
            style={{ fontFamily: DM_SANS }}
          >
            This page is for education and structure-function reference only.
            Avatar and figures are placeholders until your real data and photo populate.
          </p>

        </div>
      </div>
    </JourneySelectionProvider>
  );
}

export default YourJourneyPage;
