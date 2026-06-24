'use client';

/**
 * src/components/journey/progress/GoalProgressCard.tsx
 *
 * The goal + progress card for the Your Journey page (Prompt 208d, 3.4,
 * Task D-T3). It states the user's PRIMARY GOAL (the real goalPhrase, now wired
 * from user_health_context.goals through useJourneyState) and reads their
 * progress as the Bio Optimization Score (BOS): current vs the user's own
 * baseline (earliest BOS in the window), with a small cycle-delta chip.
 *
 * HONEST BY CONSTRUCTION: there is no real numeric "target" for a BOS, so we do
 * NOT fabricate one; the target reads "--". current and baseline read "--" until
 * real scores exist. The cycle delta reads "--" until there are at least two
 * scores. The trajectory copy is supportive and educational; it never sets an
 * aggressive target, never prescribes restriction, never shames.
 *
 * WEIGHT GUARDRAIL (208a): supportive trajectory framing only.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans, Lucide
 * strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe (no motion of
 * its own). Fail-open: never throws.
 */

import { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useJourneyState } from '@/hooks/journey/useJourneyState';
import { useBioOptimizationTrend } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';
import { Sparkline } from './Sparkline';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

/** A value or an honest em-free "--" when null/non-finite. Never fabricates. */
function num(n: number | null): string {
  return typeof n === 'number' && Number.isFinite(n) ? String(Math.round(n)) : '--';
}

export function GoalProgressCard({ userId }: { userId: string | null }) {
  // Real goal phrase: goals are now wired into useJourneyState (fail-open []).
  const { state } = useJourneyState(userId);
  const goalPhrase = state.goalPhrase;
  const cycle = state.cycle;

  // BOS trajectory over a meaningful window. Fail-open: empty series when none.
  const { data } = useBioOptimizationTrend(userId, '3M');
  const scores = useMemo(
    () => (data?.bioScores ?? []).map((p) => p.score).filter((s) => Number.isFinite(s)),
    [data],
  );

  const current = scores.length > 0 ? scores[scores.length - 1] : null;
  const baseline = scores.length > 0 ? scores[0] : null;
  const previous = scores.length >= 2 ? scores[scores.length - 2] : null;

  // Cycle delta = current - previous reading. Null (->"--") until two readings.
  const delta =
    current !== null && previous !== null ? Math.round(current - previous) : null;

  // Supportive trajectory line. Compares current to the user's own baseline,
  // never to an aggressive target. A downturn routes to a calm, encouraging
  // note, never a harder push.
  const trajectory = useMemo(() => {
    if (current === null || baseline === null) {
      return `As you log and connect data, your progress toward ${goalPhrase} fills in here.`;
    }
    const diff = current - baseline;
    if (diff > 1) {
      return `You are moving toward ${goalPhrase}, up from where you started this stretch. Steady consistency is what carries it.`;
    }
    if (diff < -1) {
      return `This is a softer stretch on the way toward ${goalPhrase}, which is a normal part of the cycle. Small, repeatable habits restore momentum.`;
    }
    return `You are holding steady toward ${goalPhrase}. A single focused area is usually the next gentle lever.`;
  }, [current, baseline, goalPhrase]);

  // Delta chip presentation (teal up, muted down/flat). Color is never the only
  // signal: the sign and an icon accompany it.
  const DeltaIcon = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaLabel =
    delta === null ? '-- this cycle' : `${delta > 0 ? '+' : ''}${delta} this cycle`;

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      {/* Goal line */}
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: TEAL }}
          >
            Your primary goal
          </span>
          <p
            className="text-[15px] font-semibold leading-snug text-white/90 md:text-base"
            style={{ fontFamily: DM_SANS }}
          >
            Working toward {goalPhrase}
          </p>
        </div>
      </div>

      {/* Progress readouts: baseline -> current, honest target. */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Baseline', value: num(baseline) },
          { label: 'Current', value: num(current) },
          // No real numeric target exists for a BOS, so we never fabricate one.
          { label: 'Target', value: '--' },
        ].map((m) => (
          <div
            key={m.label}
            className="flex flex-col rounded-lg border border-white/[0.06] bg-[rgba(11,17,32,0.45)] px-2.5 py-2"
          >
            <span className="text-[10px] uppercase tracking-wide text-white/45" style={{ fontFamily: DM_MONO }}>
              {m.label}
            </span>
            <span
              className="text-lg font-bold tabular-nums text-white"
              style={{ fontFamily: DM_SANS }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Trajectory sparkline (BOS over the window). */}
      <Sparkline points={scores} height={32} ariaLabel="Bio Optimization Score trend" />

      {/* Cycle delta chip + supportive trajectory copy. */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/85"
          style={{
            fontFamily: DM_SANS,
            background: 'rgba(45,165,160,0.12)',
            border: '1px solid rgba(45,165,160,0.24)',
          }}
          title="Change since your previous reading"
        >
          <DeltaIcon
            className="h-3.5 w-3.5 shrink-0"
            strokeWidth={1.5}
            style={{ color: delta !== null && delta > 0 ? TEAL : 'rgba(255,255,255,0.55)' }}
          />
          {deltaLabel}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-white/40" style={{ fontFamily: DM_MONO }}>
          Cycle {cycle}
        </span>
      </div>

      <p className="text-[12.5px] leading-relaxed text-white/65" style={{ fontFamily: DM_SANS }}>
        {trajectory}
      </p>
    </div>
  );
}

export default GoalProgressCard;
