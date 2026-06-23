'use client';

/**
 * src/components/journey/YourJourneyPage.tsx
 *
 * The single-scrolling "Your Journey" page composition for /analytics
 * (Prompt 208d, Task D-T1: the structural skeleton).
 *
 * This is the new single-page design that replaces the old multi-panel
 * analytics composition. It lays out the eight sections in 208d's exact
 * top-to-bottom order:
 *
 *   3.1 Phase strip           - the live JourneySpine (real)
 *   3.2 Coaching header        - profile/Hannah placeholder (left) +
 *                                the live Bio Optimization hero PlasmaGauge
 *                                plus four honest-empty pillar slots (right)
 *   3.3 Energy and stress      - honest-empty (wearable not connected)
 *   3.4 Goal and progress      - honest-empty
 *   3.5 Today                  - honest-empty
 *   3.6 Nutrition, sleep, vitals - three honest-empty placeholders
 *   3.7 Journey accelerators   - honest-empty
 *   3.8 Connection map         - interactive node-link diagram (Prompt 208d, Task D-T7)
 *
 * The spine (3.1) and the BOS hero gauge (3.2) read real data. Every other
 * section is a calm, honest empty-state placeholder that a later 208d task
 * fills in. No fake numbers, no mock data, no emojis, no em/en-dashes.
 *
 * The page is fail-open: the BOS read degrades to 0 with an honest caption,
 * and a null userId renders the whole page in its empty state. It never
 * throws.
 *
 * Style: glass-panel surfaces over Deep Navy, brand Teal #2DA5A0 / brand
 * Orange #B75E18 accents, DM Sans, Lucide icons strokeWidth 1.5,
 * reduced-motion safe. PlasmaGauge is reused UNCHANGED.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  Target,
  CalendarDays,
  Salad,
  Sparkles,
  Network,
  type LucideIcon,
} from 'lucide-react';
import {
  JourneySelectionProvider,
} from '@/components/journey/JourneySelectionContext';
import { JourneySpine } from '@/components/journey/JourneySpine';
import { ProfileCard } from '@/components/journey/coaching/ProfileCard';
import { NarrativeRead } from '@/components/journey/coaching/NarrativeRead';
import { PillarGaugeRow } from '@/components/journey/coaching/PillarGaugeRow';
import { HannahInsightPanel } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/HannahInsightPanel';
import { useBioOptimizationTrend } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';
import { useHannahInsights } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useHannahInsights';
import { GoalProgressCard } from '@/components/journey/progress/GoalProgressCard';
import { BodyCompositionCard } from '@/components/journey/progress/BodyCompositionCard';
import { EnergyBalanceTriangle } from '@/components/journey/progress/EnergyBalanceTriangle';
import { NutritionDonut } from '@/components/journey/trio/NutritionDonut';
import { SleepDonut } from '@/components/journey/trio/SleepDonut';
import { VitalTrends } from '@/components/journey/trio/VitalTrends';
import { getDisplayName } from '@/lib/user/get-display-name';
import { JourneyAcceleratorsSection } from '@/components/journey/accelerators/JourneyAcceleratorsSection';
import { EnergyStressGraph } from '@/components/journey/today/EnergyStressGraph';
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
// CoachingHeader (3.2)
//
// A two-column header. LEFT stacks the honest ProfileCard over the existing
// Hannah read (HannahInsightPanel, reused UNCHANGED). RIGHT stacks the
// NarrativeRead (state word derived from the BOS score) over the PillarGaugeRow
// (the BOS hero PlasmaGauge plus four pillar gauges, reused UNCHANGED).
//
// Real data where it exists: the BOS score and the pillar averages come from
// useBioOptimizationTrend; the Hannah read comes from useHannahInsights, wired
// the same way the analytics trend panel wires it (bioScores + current +
// weeksActive). Honest fallbacks elsewhere; this component never throws.
// ---------------------------------------------------------------------------

function CoachingHeader({ userId }: { userId: string | null }) {
  // Fail-open: gated on userId; returns current = 0 / zeroed averages when
  // there is no data. "7D" matches the analytics trend panel default. The
  // same queryKey is shared with PillarGaugeRow, so react-query dedupes it.
  const { data } = useBioOptimizationTrend(userId, '7D');
  const bioPoints = data?.bioScores ?? [];
  const current = data?.current ?? 0;
  // Honest score for the narrative: null when there is genuinely no score yet
  // (so NarrativeRead reads "getting started" rather than a fabricated tier).
  const narrativeScore =
    typeof current === 'number' && isFinite(current) && current > 0
      ? current
      : null;

  // First name, resolved the same way the spine and ProfileCard do (fail-open).
  const [displayName, setDisplayName] = useState<string>('');
  useEffect(() => {
    let active = true;
    getDisplayName()
      .then((n) => {
        if (active) setDisplayName(n);
      })
      .catch(() => {
        /* keep empty default; the read falls back to "there" */
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // weeksActive: spans of the real bio score history, mirroring the trend panel.
  const weeksActive = useMemo(() => {
    if (bioPoints.length === 0) return 0;
    const first = new Date(bioPoints[0].date).getTime();
    const last = new Date(bioPoints[bioPoints.length - 1].date).getTime();
    if (!isFinite(first) || !isFinite(last)) return 0;
    return Math.max(1, Math.round((last - first) / (7 * 24 * 60 * 60 * 1000)));
  }, [bioPoints]);

  // The existing Hannah read engine, wired exactly as the analytics panel does.
  const insight = useHannahInsights({
    userId,
    displayName,
    range: '7D',
    points: bioPoints,
    current,
    weeksActive,
  });

  return (
    <SectionShell eyebrow="Your Coaching" title="Coaching summary" icon={Sparkles}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: profile card stacked over the existing Hannah read. */}
        <div className="flex flex-col gap-4">
          <ProfileCard userId={userId} />
          <HannahInsightPanel insight={insight} />
        </div>

        {/* RIGHT: narrative read stacked over the BOS hero + pillar gauges. */}
        <div className="flex flex-col gap-4">
          <NarrativeRead
            userId={userId}
            displayName={displayName}
            score={narrativeScore}
          />
          <PillarGaugeRow userId={userId} />
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// YourJourneyPage
// ---------------------------------------------------------------------------

export function YourJourneyPage({ userId }: { userId: string | null }) {
  // The reused spine and PlasmaGauge each honor reduced motion internally, and
  // each section component gates any motion of its own on useReducedMotion.
  return (
    <JourneySelectionProvider>
      <div className="relative z-10 min-h-screen text-white">
        <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-6 md:py-8">
          {/* 3.1 PHASE STRIP: the live spine, pinned-in-feel at the top. */}
          <JourneySpine userId={userId} />

          {/* 3.2 COACHING HEADER: profile + Hannah (left), BOS hero + pillars (right). */}
          <CoachingHeader userId={userId} />

          {/* 3.3 ENERGY AND STRESS */}
          <SectionShell
            eyebrow="Through your day"
            title="Energy and stress"
            icon={Activity}
          >
            <EnergyStressGraph />
          </SectionShell>

          {/* 3.4 GOAL AND PROGRESS */}
          <SectionShell
            eyebrow="Where you are headed"
            title="Goal and progress"
            icon={Target}
          >
            <div className="flex flex-col gap-4">
              {/* Goal + progress on top, full width. */}
              <GoalProgressCard userId={userId} />
              {/* Body composition + energy balance, side by side on desktop,
                  stacked on mobile. */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <BodyCompositionCard userId={userId} />
                <EnergyBalanceTriangle userId={userId} />
              </div>
            </div>
          </SectionShell>

          {/* 3.5 TODAY */}
          <SectionShell eyebrow="Right now" title="Today" icon={CalendarDays}>
            <TodayStats userId={userId} />
          </SectionShell>

          {/* 3.6 NUTRITION, SLEEP, VITALS: a three-column trio. Nutrition (live
              macros donut) and the Hydration vital read real data; the sleep
              donut and the four flag-off vitals are honest-empty. */}
          <SectionShell
            eyebrow="Your inputs"
            title="Nutrition, sleep, and vitals"
            icon={Salad}
          >
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3">
              <NutritionDonut userId={userId} />
              <SleepDonut userId={userId} />
              <VitalTrends userId={userId} />
            </div>
          </SectionShell>

          {/* 3.7 JOURNEY ACCELERATORS */}
          <SectionShell
            eyebrow="What moves you forward"
            title="Journey accelerators"
            icon={Sparkles}
          >
            <JourneyAcceleratorsSection userId={userId} />
          </SectionShell>

          {/* 3.8 CONNECTION MAP */}
          <SectionShell
            eyebrow="How it connects"
            title="Connection map"
            icon={Network}
          >
            <ConnectionMap />
          </SectionShell>
        </div>
      </div>
    </JourneySelectionProvider>
  );
}

export default YourJourneyPage;
