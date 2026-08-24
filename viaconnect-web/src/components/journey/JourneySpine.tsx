'use client';

/**
 * src/components/journey/JourneySpine.tsx
 *
 * The persistent journey Spine band (Prompt 208c, Phase 1, Task P1-T3).
 *
 * A compact band pinned to the top of /analytics. It shows the user's place in
 * a five-phase progression (Baseline, Protocol, Tracking, Re-test, Adjust) with
 * the current phase active, the cycle number, Hannah's one-line read as the
 * voice of the spine, the single next action, momentum chips, and the goal
 * phrase so the destination is always visible.
 *
 * Reads:
 *   - useJourneyState(userId): the derived phase/cycle/nextAction/goalPhrase +
 *     momentum (fail-open; degrades to Baseline with honest copy).
 *   - useJourneySelection(): reflects/sets a selected phase so the spine
 *     participates in the shared selection context.
 *
 * Style: glass-panel / Deep Navy band, TEAL (#2DA5A0) active accent, DM Sans,
 * Lucide icons strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe.
 * Educational and honest framing; no medical claims.
 */

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Pill,
  LineChart,
  FlaskConical,
  SlidersHorizontal,
  Flame,
  CalendarClock,
  Target,
  type LucideIcon,
} from 'lucide-react';
import {
  useJourneyState,
  type JourneyMomentum,
} from '@/hooks/journey/useJourneyState';
import { useJourneySelection } from '@/components/journey/JourneySelectionContext';
import type { JourneyPhase, JourneyState } from '@/lib/journey/deriveJourneyState';
import { getDisplayName } from '@/lib/user/get-display-name';
import { useReducedMotion } from '@/components/body-tracker/HoverSystem/useReducedMotion';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

/** Ordered phase progression with an icon and a short id per phase. */
const PHASE_STEPS: { phase: JourneyPhase; id: string; icon: LucideIcon }[] = [
  { phase: 'Baseline', id: 'baseline', icon: Sparkles },
  { phase: 'Protocol', id: 'protocol', icon: Pill },
  { phase: 'Tracking', id: 'tracking', icon: LineChart },
  { phase: 'Re-test', id: 'retest', icon: FlaskConical },
  { phase: 'Adjust', id: 'adjust', icon: SlidersHorizontal },
];

// ---------------------------------------------------------------------------
// Hannah's one-line read
//
// Hannah is the voice of the spine. A short, honest, educational line built
// from the phase and the next action, addressing the user by name. No medical
// claims, no dashes, no emojis.
// ---------------------------------------------------------------------------

function hannahRead(name: string, state: JourneyState): string {
  const who = name.trim();
  const lead = (named: string, unnamed: string) => (who ? named : unnamed);
  switch (state.phase) {
    case 'Baseline':
      return lead(
        `${who}, this is your starting point. ${state.nextAction} so we can build from real data.`,
        `This is your starting point. ${state.nextAction} so we can build from real data.`,
      );
    case 'Protocol':
      return lead(
        `${who}, your protocol is set. ${state.nextAction} to begin.`,
        `Your protocol is set. ${state.nextAction} to begin.`,
      );
    case 'Tracking':
      return lead(`Nice momentum, ${who}. ${state.nextAction}.`, `Nice momentum. ${state.nextAction}.`);
    case 'Re-test':
      return lead(
        `${who}, you have given this enough time to show a signal. ${state.nextAction}.`,
        `You have given this enough time to show a signal. ${state.nextAction}.`,
      );
    case 'Adjust':
      return lead(
        `${who}, your re-test is in. ${state.nextAction} to refine your next cycle.`,
        `Your re-test is in. ${state.nextAction} to refine your next cycle.`,
      );
    default:
      return lead(`${who}, ${state.nextAction}.`, state.nextAction);
  }
}

// ---------------------------------------------------------------------------
// Momentum chip rendering
//
// Renders the literal value or "--" when null. Never invents a number.
// ---------------------------------------------------------------------------

function chipValue(n: number | null): string {
  return typeof n === 'number' && isFinite(n) ? String(n) : '--';
}

// ---------------------------------------------------------------------------
// Phase pip
// ---------------------------------------------------------------------------

function PhasePip({
  step,
  isActive,
  isSelected,
  reduced,
  onSelect,
}: {
  step: { phase: JourneyPhase; id: string; icon: LucideIcon };
  isActive: boolean;
  isSelected: boolean;
  reduced: boolean;
  onSelect: () => void;
}) {
  const Icon = step.icon;
  // Active phase: teal. Selected (but not active): teal ring emphasis.
  // Others: muted.
  const accent = isActive || isSelected;
  const border = accent
    ? 'rgba(45,165,160,0.55)'
    : 'rgba(255,255,255,0.10)';
  const bg = isActive
    ? 'rgba(45,165,160,0.18)'
    : isSelected
      ? 'rgba(45,165,160,0.10)'
      : 'rgba(22,36,64,0.40)';
  const iconColor = accent ? TEAL : 'rgba(255,255,255,0.45)';
  const labelColor = isActive
    ? 'text-white'
    : accent
      ? 'text-white/80'
      : 'text-white/45';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-current={isActive ? 'step' : undefined}
      title={`${step.phase} phase`}
      className={`group flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 ${
        reduced ? '' : 'transition-colors'
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,165,160,0.6)]`}
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        strokeWidth={1.5}
        style={{ color: iconColor }}
      />
      <span
        className={`text-[11px] font-semibold ${labelColor}`}
        style={{ fontFamily: DM_SANS }}
      >
        {step.phase}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Momentum chip
// ---------------------------------------------------------------------------

function MomentumChip({
  icon: Icon,
  value,
  unit,
  label,
}: {
  icon: LucideIcon;
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
      style={{
        background: 'rgba(22,36,64,0.55)',
        border: '1px solid rgba(45,165,160,0.18)',
      }}
      title={label}
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        strokeWidth={1.5}
        style={{ color: TEAL }}
      />
      <span
        className="text-xs font-bold tabular-nums text-white"
        style={{ fontFamily: DM_SANS }}
      >
        {value}
      </span>
      <span className="text-[10px] text-white/45" style={{ fontFamily: DM_SANS }}>
        {unit}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JourneySpine
// ---------------------------------------------------------------------------

export function JourneySpine({ userId }: { userId: string | null }) {
  const { state, momentum } = useJourneyState(userId);
  const { selection, setSelection } = useJourneySelection();
  const reduced = useReducedMotion();

  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    let active = true;
    // getDisplayName fails open to empty; guard for a late resolution.
    getDisplayName()
      .then((n) => {
        if (active) setDisplayName(n);
      })
      .catch(() => {
        /* keep the empty default; hannahRead uses an unnamed greeting */
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const read = hannahRead(displayName, state);
  const m: JourneyMomentum = momentum;

  return (
    <div
      className="glass-panel w-full px-4 py-3 md:px-5 md:py-4"
      style={{
        background: 'rgba(11,17,32,0.72)',
        border: '1px solid rgba(45,165,160,0.20)',
      }}
      aria-label="Your wellness journey"
    >
      {/* Header row: cycle + goal phrase */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: TEAL }}
          >
            Your Journey
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/80"
            style={{
              fontFamily: DM_MONO,
              background: 'rgba(45,165,160,0.12)',
              border: '1px solid rgba(45,165,160,0.24)',
            }}
          >
            Cycle {state.cycle}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-white/70">
          <Target className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
          <span className="text-[11px]" style={{ fontFamily: DM_SANS }}>
            Working toward {state.goalPhrase}
          </span>
        </div>
      </div>

      {/* Phase progression: a compact, wrapping row of pips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PHASE_STEPS.map((step) => {
          const isActive = step.phase === state.phase;
          const isSelected =
            selection?.type === 'phase' &&
            selection.id.toLowerCase().trim() === step.id;
          return (
            <PhasePip
              key={step.id}
              step={step}
              isActive={isActive}
              isSelected={isSelected}
              reduced={reduced}
              onSelect={() =>
                setSelection({ type: 'phase', id: step.id, label: step.phase })
              }
            />
          );
        })}
      </div>

      {/* Read + action + momentum: stacks on mobile, single row on desktop */}
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Hannah's one-line read */}
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              fontFamily: DM_MONO,
              color: TEAL,
              background: 'rgba(45,165,160,0.12)',
              border: '1px solid rgba(45,165,160,0.24)',
            }}
          >
            Hannah
          </span>
          <p
            className="min-w-0 text-[13px] leading-relaxed text-white/85"
            style={{ fontFamily: DM_SANS }}
          >
            {read}
          </p>
        </div>

        {/* Next action + momentum chips */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            style={{
              fontFamily: DM_SANS,
              background: 'rgba(45,165,160,0.16)',
              border: '1px solid rgba(45,165,160,0.40)',
            }}
          >
            {state.nextAction}
          </span>
          <MomentumChip
            icon={CalendarClock}
            value={chipValue(m.daysToNextMilestone)}
            unit="days to re-test"
            label="Days until your next re-test"
          />
          <MomentumChip
            icon={Flame}
            value={chipValue(m.currentStreak)}
            unit="day streak"
            label="Consecutive check-in days"
          />
        </div>
      </div>
    </div>
  );
}
