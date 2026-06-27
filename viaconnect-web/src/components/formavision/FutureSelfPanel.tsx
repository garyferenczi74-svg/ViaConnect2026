'use client';

// Prompt 210b P5-T1c: Future-Self panel. Wires the P5-T1a projection lib and
// P5-T1b ghost seam to real user data. Resolves the stored goal, computes the
// ghost vector, and drives the honest-labeled show/hide toggle on the avatar.
//
// HONESTY CONTRACT:
//   - Default OFF (avatar unchanged, byte-identical to today's shape).
//   - No goal or no baseline scan -> honest-disabled toggle + labeled reason.
//     'no-goal'         -> CTA to /body-tracker/progress (existing goal surface).
//     'no-current-scan' -> needs a current scan message.
//   - Confidence marker is QUALITATIVE only. "Projection, not a guarantee."
//     No fabricated numeric confidence. No adherence-weighted estimate.
//   - Weeks / estimated date shown ONLY when both goalWeightKg AND goalBodyFatPct
//     are present. Omitted otherwise. Never a fabricated date.
//   - P5-T2: segmental-fat ghost is always honest-disabled (labeled note present
//     in all non-loading states). No per-region future tint is ever produced.
//
// Goal read path:
//   - goalWeightKg + currentWeightKg via useWeightGoalKg (canonical weight goal).
//   - goalBodyFatPct via useActiveBodyGoal -> goal.goal_bodyfat_pct (nullable).
//
// Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
// only (Teal #2DA5A0 / Navy #1E3054 / Orange #B75E18), Instrument Sans.
// Desktop + mobile responsive from first line. 44px touch targets. Fail-open reads.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Info, Eye, EyeOff, Target } from 'lucide-react';
import { useActiveBodyGoal } from '@/hooks/journey/useActiveBodyGoal';
import { useWeightGoalKg } from '@/hooks/useWeightGoalKg';
import { projectFutureSelfVector } from '@/lib/formavision/projection/projectFutureSelfVector';
import type { FutureSelfProjection } from '@/lib/formavision/projection/projectFutureSelfVector';
import { WEEKLY_FAT_LOSS_KG } from '@/lib/arnold/scanning/futureMeProjector';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex, BodyParamVector } from '@/lib/formavision/geometry/types';

// ---------------------------------------------------------------------------
// Week-summary helpers (pure, exported for TDD)
// ---------------------------------------------------------------------------

// Weekly conservative weight-change rate. Single-sourced from futureMeProjector
// (WEEKLY_FAT_LOSS_KG) so this readout can never drift from the morph timeline.

export interface WeekSummary {
  weeksToGoal: number;
  /** Estimated arrival date, YYYY-MM-DD. */
  estimatedDate: string;
  /** Same assumptions framing as projectFutureMe.assumptionsNote. */
  assumptionsNote: string;
}

/**
 * Derives a week-count and estimated arrival date from the weight delta.
 * Returns null if ANY input is null (never fabricate a date).
 *
 * Both goalWeightKg AND goalBodyFatPct must be present: the spec requires
 * the date readout only when both a weight goal and a BF goal exist.
 *
 * Pure function, exported for direct TDD. The returned estimatedDate varies
 * with wall time; tests should assert weeksToGoal (deterministic) rather
 * than the raw date string.
 */
export function computeWeekSummary(
  currentWeightKg: number | null,
  goalWeightKg: number | null,
  goalBodyFatPct: number | null,
): WeekSummary | null {
  if (currentWeightKg === null || goalWeightKg === null || goalBodyFatPct === null) {
    return null;
  }
  const delta = Math.abs(goalWeightKg - currentWeightKg);
  const weeksToGoal = Math.max(1, Math.ceil(delta / WEEKLY_FAT_LOSS_KG));
  const estimatedDate = new Date(
    Date.now() + weeksToGoal * 7 * 86400000,
  ).toISOString().slice(0, 10);
  return {
    weeksToGoal,
    estimatedDate,
    assumptionsNote: `Projection assumes consistent protocol adherence and sustainable weekly weight change of about ${WEEKLY_FAT_LOSS_KG.toFixed(2)} kg. Actual results vary with training, sleep, nutrition, and individual biology.`,
  };
}

// ---------------------------------------------------------------------------
// Pure panel content (no hooks, exported for TDD with renderToStaticMarkup)
// ---------------------------------------------------------------------------

export interface FutureSelfPanelContentProps {
  /** null indicates the goal / scan data is still loading. */
  projection: FutureSelfProjection | null;
  showGhost: boolean;
  onToggle: () => void;
  weekSummary: WeekSummary | null;
  reducedMotion?: boolean;
}

/**
 * Pure renderer. No hooks, no side effects. Accepts the resolved projection
 * state as props. Exported for direct testing with renderToStaticMarkup.
 */
export function FutureSelfPanelContent({
  projection,
  showGhost,
  onToggle,
  weekSummary,
  reducedMotion = false,
}: FutureSelfPanelContentProps) {
  // Loading skeleton while goal / scan data resolve.
  if (projection === null) {
    return (
      <div
        data-testid="future-self-loading"
        aria-busy="true"
        aria-label="Loading projected self"
        className={`h-14 rounded-xl bg-white/[0.04] ${
          reducedMotion ? '' : 'motion-safe:animate-pulse'
        }`}
      />
    );
  }

  const isProjected = projection.kind === 'projected';

  return (
    <div
      data-testid="future-self-panel"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 sm:p-5 backdrop-blur-sm space-y-4"
    >
      {/* Header + toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-sm font-semibold text-white">Projected Self</h3>
          <p className="text-xs leading-relaxed text-white/60">
            A shape estimate based on your goal and current scan. Tendency, not a guarantee.
          </p>
        </div>

        {isProjected ? (
          <button
            type="button"
            data-testid="future-self-toggle"
            aria-pressed={showGhost}
            onClick={onToggle}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors sm:self-center ${
              showGhost
                ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/20 text-[#2DA5A0]'
                : 'border-white/20 bg-white/[0.06] text-white/70 hover:bg-white/[0.10]'
            }`}
          >
            {showGhost ? (
              <EyeOff size={14} strokeWidth={1.5} />
            ) : (
              <Eye size={14} strokeWidth={1.5} />
            )}
            {showGhost ? 'Hide ghost' : 'Show ghost'}
          </button>
        ) : (
          <button
            type="button"
            data-testid="future-self-toggle-disabled"
            disabled
            aria-disabled="true"
            className="inline-flex min-h-[44px] shrink-0 cursor-not-allowed items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/25 sm:self-center"
          >
            <Eye size={14} strokeWidth={1.5} />
            Show ghost
          </button>
        )}
      </div>

      {/* Disabled state: no-goal */}
      {!isProjected && projection.reason === 'no-goal' && (
        <div
          data-testid="future-self-no-goal"
          className="rounded-xl border border-[#B75E18]/25 bg-[#B75E18]/10 p-4 space-y-3"
        >
          <p className="text-xs leading-relaxed text-white/70">
            Set a body composition goal to see your projected self.
          </p>
          <Link
            href="/body-tracker/progress"
            data-testid="future-self-goal-cta"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-2.5 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20"
          >
            <Target size={14} strokeWidth={1.5} />
            Set a body composition goal
          </Link>
        </div>
      )}

      {/* Disabled state: no-current-scan */}
      {!isProjected && projection.reason === 'no-current-scan' && (
        <div
          data-testid="future-self-no-scan"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3"
        >
          <p className="text-xs leading-relaxed text-white/60">
            Needs a current scan to project a goal shape. Log a body composition
            entry first.
          </p>
        </div>
      )}

      {/* Projected state: week summary + estimate disclaimer */}
      {isProjected && (
        <>
          {weekSummary !== null && (
            <div
              data-testid="future-self-weeks"
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 space-y-1"
            >
              <p className="text-xs font-semibold text-white">
                ~{weekSummary.weeksToGoal} weeks at current trajectory
              </p>
              <p className="text-xs text-white/50">
                Estimated arrival: {weekSummary.estimatedDate}
              </p>
            </div>
          )}

          {/* AI-estimate disclaimer: Info-block pattern (mirrors BodyScanResults) */}
          <div
            data-testid="future-self-estimate-label"
            className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/50"
          >
            <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-white/40" />
            <p>
              Estimate only. Projection, not a guarantee. Based on your goal body-fat
              target and current scan. Assumes consistent protocol adherence. Individual
              results vary with training, sleep, and biology. Not a clinical or diagnostic
              finding.
            </p>
          </div>

          {weekSummary !== null && (
            <p
              data-testid="future-self-assumptions-note"
              className="text-[11px] leading-relaxed text-white/35"
            >
              {weekSummary.assumptionsNote}
            </p>
          )}
        </>
      )}

      {/* P5-T2 (segmental-fat ghost): always honest-disabled in all non-loading states.
          Per-region future body fat is never projected because there is no historical
          slope at this stage. No fabricated per-region future tint is ever produced.
          This note ships visibly labeled so the user is never silently shown a
          fabricated body region. */}
      <div
        data-testid="future-self-segmental-note"
        className="flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-xs text-white/40"
      >
        <Info size={13} strokeWidth={1.5} className="mt-0.5 flex-none" />
        <p>
          Per-region future body fat is not projected. Segmental estimates require
          more scan history to build a reliable trend.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper: hook wire-up + ghost state management
// ---------------------------------------------------------------------------

export interface FutureSelfPanelProps {
  snapshot: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  sex: Sex;
  unit: MeasurementUnit;
  userId: string | null;
  reducedMotion?: boolean;
  /**
   * Called whenever the ghost state changes. The parent (page.tsx) routes
   * ghostVector and showGhost down to BodyCompositionAvatar via the P5-T1b
   * prop seam. Called with (null, false) when the projection is disabled or
   * the user hides the ghost.
   */
  onGhostChange: (ghostVector: BodyParamVector | null, showGhost: boolean) => void;
}

/**
 * Resolves the stored goal, computes the ghost vector, and drives showGhost on
 * the avatar via the P5-T1b prop seam. Default OFF (byte-identical to today).
 *
 * Goal body-fat read path: useActiveBodyGoal -> goal.goal_bodyfat_pct (nullable).
 * Goal weight read path: useWeightGoalKg -> goalWeightKg (nullable).
 * Both reads fail-open (return null on error), so a fetch failure never shows
 * a fabricated ghost.
 */
export function FutureSelfPanel({
  snapshot,
  circumferences,
  sex,
  unit,
  userId,
  reducedMotion,
  onGhostChange,
}: FutureSelfPanelProps) {
  const { goal, loading: goalLoading } = useActiveBodyGoal(userId);
  const { goalWeightKg, currentWeightKg, loading: weightLoading } = useWeightGoalKg(userId);

  // Default OFF per honesty contract. Never flipped on without explicit user action.
  const [showGhost, setShowGhost] = useState(false);

  // goal_bodyfat_pct is nullable: null means no BF goal, which disables the ghost.
  const goalBodyFatPct: number | null = goal?.goal_bodyfat_pct ?? null;
  const isLoading = goalLoading || weightLoading;

  // The projection is pure (projectFutureSelfVector is deterministic). Recompute
  // whenever the inputs change. null while loading (shows skeleton).
  const projection = useMemo<FutureSelfProjection | null>(() => {
    if (isLoading) return null;
    // No snapshot -> cannot compute a delta; return no-current-scan.
    if (!snapshot) return { kind: 'disabled', reason: 'no-current-scan' };
    return projectFutureSelfVector(
      { snapshot, circumferences, sex, unit },
      goalBodyFatPct,
    );
  }, [snapshot, circumferences, sex, unit, goalBodyFatPct, isLoading]);

  // Week summary: only when both weight goal and BF goal are present.
  const weekSummary = useMemo(
    () => computeWeekSummary(currentWeightKg, goalWeightKg, goalBodyFatPct),
    [currentWeightKg, goalWeightKg, goalBodyFatPct],
  );

  // When projection switches away from 'projected' (goal removed, scan cleared,
  // or load reset), reset the ghost to OFF and clear the avatar ghost so it
  // returns to byte-identical today's shape.
  const projectionKind = projection?.kind;
  useEffect(() => {
    if (projectionKind !== undefined && projectionKind !== 'projected') {
      setShowGhost(false);
      onGhostChange(null, false);
    }
    // Intentionally narrow dep: only react to kind changes. The full projection
    // object changes on every vector recompute; reacting to it would reset the
    // toggle on every scan change, undoing a user's explicit "show ghost" action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectionKind]);

  const handleToggle = useCallback(() => {
    if (projection?.kind !== 'projected') return;
    const next = !showGhost;
    setShowGhost(next);
    onGhostChange(next ? projection.vector : null, next);
  }, [showGhost, projection, onGhostChange]);

  return (
    <FutureSelfPanelContent
      projection={isLoading ? null : projection}
      showGhost={showGhost}
      onToggle={handleToggle}
      weekSummary={weekSummary}
      reducedMotion={reducedMotion}
    />
  );
}
