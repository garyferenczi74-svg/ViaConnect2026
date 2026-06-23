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
 *   3.8 Connection map         - honest-empty
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

import { useMemo, type ReactNode } from 'react';
import {
  Activity,
  HeartPulse,
  Target,
  CalendarDays,
  Salad,
  Moon,
  Stethoscope,
  Sparkles,
  Network,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import {
  JourneySelectionProvider,
} from '@/components/journey/JourneySelectionContext';
import { JourneySpine } from '@/components/journey/JourneySpine';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import { useBioOptimizationTrend } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';

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
// EmptyNote: a single calm honest line used inside placeholder sections.
//
// No fake data. An optional Lucide icon (strokeWidth 1.5) and a muted note.
// ---------------------------------------------------------------------------

function EmptyNote({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] px-3.5 py-3">
      {Icon && (
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{ color: 'rgba(255,255,255,0.45)' }}
        />
      )}
      <p
        className="text-[13px] leading-relaxed text-white/65"
        style={{ fontFamily: DM_SANS }}
      >
        {children}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PillarSlot: a small honest-empty placeholder for a pillar gauge.
//
// Renders the pillar label and a quiet "Computing" note. No number, no fake
// gauge. Task D-T2 replaces these with the real pillar gauges.
// ---------------------------------------------------------------------------

function PillarSlot({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.45)] px-2 py-3 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08]"
        style={{ background: 'rgba(11,17,32,0.55)' }}
        aria-hidden="true"
      >
        <Gauge
          className="h-4 w-4"
          strokeWidth={1.5}
          style={{ color: 'rgba(255,255,255,0.35)' }}
        />
      </div>
      <span
        className="text-[11px] font-semibold text-white/75"
        style={{ fontFamily: DM_SANS }}
      >
        {label}
      </span>
      <span
        className="text-[9px] uppercase tracking-wider text-white/35"
        style={{ fontFamily: DM_MONO }}
      >
        Computing
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CoachingHeader (3.2)
//
// LEFT: an honest profile + Hannah-read placeholder.
// RIGHT: the real Bio Optimization hero PlasmaGauge (value from the existing
//        useBioOptimizationTrend current score) plus four honest-empty pillar
//        slots. When the score is null/0 the gauge sits at 0 with an honest
//        "Score is computing" caption and never a fake number.
// ---------------------------------------------------------------------------

const PILLARS = ['Recovery', 'Sleep', 'Nutrition', 'Movement'] as const;

function CoachingHeader({ userId }: { userId: string | null }) {
  // Fail-open: the hook is gated on userId and returns current = 0 when there
  // is no score. "7D" is the same default range the trend panel reads.
  const { data, isLoading } = useBioOptimizationTrend(userId, '7D');
  const bos = data?.current ?? null;
  const gaugeValue = typeof bos === 'number' && isFinite(bos) ? bos : 0;
  const hasScore = typeof bos === 'number' && isFinite(bos) && bos > 0;

  return (
    <SectionShell eyebrow="Your Coaching" title="Coaching summary" icon={Sparkles}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: profile + Hannah read placeholder */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                fontFamily: DM_MONO,
                color: TEAL,
                background: 'rgba(45,165,160,0.12)',
                border: '1px solid rgba(45,165,160,0.24)',
              }}
            >
              Hannah
            </span>
            <span
              className="text-[11px] uppercase tracking-wider text-white/40"
              style={{ fontFamily: DM_MONO }}
            >
              Your coach
            </span>
          </div>
          <p
            className="text-[14px] font-semibold leading-relaxed text-white/85"
            style={{ fontFamily: DM_SANS }}
          >
            Your coaching summary is coming together.
          </p>
          <p
            className="text-[12.5px] leading-relaxed text-white/55"
            style={{ fontFamily: DM_SANS }}
          >
            As you log and connect your data, a personalized read of where you are
            and what to focus on next will appear here.
          </p>
        </div>

        {/* RIGHT: BOS hero gauge + four pillar slots */}
        <div className="flex flex-col items-center gap-4 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
          <div className="flex flex-col items-center">
            <PlasmaGauge
              value={gaugeValue}
              metric="bioscore"
              variant="hero"
              size={188}
              max={100}
            />
            <span
              className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/70"
              style={{ fontFamily: DM_MONO }}
            >
              Bio Optimization
            </span>
            <span
              className="mt-0.5 text-[11px] text-white/45"
              style={{ fontFamily: DM_SANS }}
            >
              {hasScore
                ? 'Your current Bio Optimization Score'
                : isLoading
                  ? 'Reading your score'
                  : 'Score is computing'}
            </span>
          </div>

          <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PILLARS.map((p) => (
              <PillarSlot key={p} label={p} />
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// YourJourneyPage
// ---------------------------------------------------------------------------

export function YourJourneyPage({ userId }: { userId: string | null }) {
  // The skeleton does not animate, so it imposes no motion of its own; the
  // reused spine and PlasmaGauge each honor reduced motion internally. Later
  // tasks that add motion inside a section should gate it on useReducedMotion.
  // Stable nutrition/sleep/vitals triad definition (3.6).
  const triad = useMemo(
    () =>
      [
        {
          title: 'Nutrition',
          icon: Salad,
          note: 'Your nutrition trends appear here as you log meals.',
        },
        {
          title: 'Sleep',
          icon: Moon,
          note: 'Your sleep trends appear here when a wearable is connected.',
        },
        {
          title: 'Vital trends',
          icon: Stethoscope,
          note: 'Your vital trends appear here when readings are available.',
        },
      ] as const,
    [],
  );

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
            <EmptyNote icon={HeartPulse}>
              Connect a wearable to see your energy and stress through the day.
            </EmptyNote>
          </SectionShell>

          {/* 3.4 GOAL AND PROGRESS */}
          <SectionShell
            eyebrow="Where you are headed"
            title="Goal and progress"
            icon={Target}
          >
            <EmptyNote icon={Target}>
              Your goal progress and body composition appear here.
            </EmptyNote>
          </SectionShell>

          {/* 3.5 TODAY */}
          <SectionShell eyebrow="Right now" title="Today" icon={CalendarDays}>
            <EmptyNote icon={CalendarDays}>
              Today&apos;s activity appears when a wearable is connected; hydration
              shows your logged intake.
            </EmptyNote>
          </SectionShell>

          {/* 3.6 NUTRITION, SLEEP, VITALS */}
          <SectionShell
            eyebrow="Your inputs"
            title="Nutrition, sleep, and vitals"
            icon={Salad}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {triad.map((t) => (
                <div
                  key={t.title}
                  className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <t.icon
                      className="h-4 w-4 shrink-0"
                      strokeWidth={1.5}
                      style={{ color: TEAL }}
                    />
                    <span
                      className="text-[13px] font-semibold text-white/85"
                      style={{ fontFamily: DM_SANS }}
                    >
                      {t.title}
                    </span>
                  </div>
                  <p
                    className="text-[12px] leading-relaxed text-white/55"
                    style={{ fontFamily: DM_SANS }}
                  >
                    {t.note}
                  </p>
                </div>
              ))}
            </div>
          </SectionShell>

          {/* 3.7 JOURNEY ACCELERATORS */}
          <SectionShell
            eyebrow="What moves you forward"
            title="Journey accelerators"
            icon={Sparkles}
          >
            <EmptyNote icon={Sparkles}>
              Your accelerators appear here.
            </EmptyNote>
          </SectionShell>

          {/* 3.8 CONNECTION MAP */}
          <SectionShell
            eyebrow="How it connects"
            title="Connection map"
            icon={Network}
          >
            <EmptyNote icon={Network}>
              Your hub connection map appears here.
            </EmptyNote>
          </SectionShell>
        </div>
      </div>
    </JourneySelectionProvider>
  );
}

export default YourJourneyPage;
