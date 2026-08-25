'use client';

/**
 * src/components/formavision/BOSMovementReadout.tsx
 *
 * Prompt 210b P6-T3: Bio Optimization Score movement readout.
 *
 * A compact, read-only readout mounted on the Body Composition surface.
 * Shows the canonical Bio Optimization Score (Connections BOS SSOT) and its
 * movement since the user's baseline, framed honestly as "since baseline".
 *
 * Data source: resolveConnectionsBosDisplay (same function as Connections /
 * Dashboard / Analytics). No CAQ composite in this slot.
 *
 * HONESTY CONTRACT:
 *   score null     -> calm "will appear once computed" state (never 0, never
 *                     a fabricated movement)
 *   baseline null  -> show score WITHOUT a movement delta; "baseline pending"
 *                     note. No fabricated movement.
 *   both present   -> score + tier + movement (up/down/steady) framed
 *                     "since baseline" (score minus baseline, NOT a per-scan
 *                     delta which would require a new data path).
 *
 * Reuses bos-gauge-helpers.ts (colorForScore, labelForScore, sentenceCase)
 * for tier color/label idioms. Does NOT fork the PlasmaGauge or
 * BOSScoreGauge: a compact readout only.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, design
 * tokens (Teal #2DA5A0 / Navy #1E3054 / Orange #B75E18), Instrument Sans,
 * responsive desktop + mobile, 44px touch targets on interactive, fail-open.
 *
 * 2026-06-27. No em/en dashes.
 */

import { Activity, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import {
  colorForScore,
  labelForScore,
  sentenceCase,
} from '@/components/dashboard/bos-gauge-helpers';
import { useWearableTilesSnapshot } from '@/hooks/useWearableTilesSnapshot';
import {
  connectionsBosNumericScore,
  namedWearableContributorCount,
  resolveConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';
import {
  computeBOSMovement,
  movementLabel,
} from '@/lib/formavision/bos/bosMovement';
import type { BOSMovementState } from '@/lib/formavision/bos/bosMovement';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BOSMovementReadoutContentProps {
  /** The resolved BOS movement state, or 'loading' during the initial fetch. */
  state: BOSMovementState | 'loading';
  /** When true, disables CSS animations (prefers-reduced-motion override). */
  reducedMotion?: boolean;
}

export interface BOSMovementReadoutProps {
  reducedMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Pure content renderer
// Exported so tests can use renderToStaticMarkup without hooks.
// No side effects, no network calls.
// ---------------------------------------------------------------------------

export function BOSMovementReadoutContent({
  state,
  reducedMotion,
}: BOSMovementReadoutContentProps) {
  // Loading skeleton
  if (state === 'loading') {
    return (
      <div
        data-testid="bos-movement-loading"
        aria-busy="true"
        aria-label="Loading Bio Optimization Score"
        className={`h-16 rounded-xl bg-white/[0.04] ${
          reducedMotion ? '' : 'motion-safe:animate-pulse'
        }`}
      />
    );
  }

  return (
    <div
      data-testid="bos-movement-readout"
      className="rounded-2xl border border-[#2DA5A0]/20 bg-[#1E3054]/40 p-4 sm:p-5 backdrop-blur-sm"
    >
      {/* Header: "Bio Optimization Score" is the ONLY label name */}
      <div className="mb-3 flex items-center gap-2">
        <Activity
          size={16}
          strokeWidth={1.5}
          className="flex-none text-[#2DA5A0]"
          aria-hidden="true"
        />
        <h3
          data-testid="bos-movement-label"
          className="text-sm font-semibold text-white"
        >
          Bio Optimization Score
        </h3>
      </div>

      {/* State branches */}
      {state.kind === 'no-score' ? (
        <NoScoreState />
      ) : state.kind === 'no-baseline' ? (
        <NoBaselineState state={state} />
      ) : (
        <ReadyState state={state} />
      )}

      {/* Disclaimer: score is an AI-derived metric, not a clinical measure */}
      <div
        data-testid="bos-movement-disclaimer"
        className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/50"
      >
        <Info
          size={14}
          strokeWidth={1.5}
          className="mt-0.5 flex-none text-white/40"
          aria-hidden="true"
        />
        <p>
          Your Bio Optimization Score is an AI-derived wellness metric, not a
          clinical measure. Results are informational only.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State sub-renders (pure helper components, no hooks)
// ---------------------------------------------------------------------------

function NoScoreState() {
  return (
    <p
      data-testid="bos-movement-no-score"
      className="text-xs leading-relaxed text-white/55"
    >
      Your Bio Optimization Score will appear once computed. Complete your
      Health Assessment Questionnaire to get started.
    </p>
  );
}

function NoBaselineState({
  state,
}: {
  state: Extract<BOSMovementState, { kind: 'no-baseline' }>;
}) {
  const color = colorForScore(state.score);
  const tierLabel = labelForScore(state.score);

  return (
    <div className="flex flex-col gap-2">
      {/* Score row: real score shown, no fabricated delta */}
      <div className="flex items-baseline gap-2">
        <span
          data-testid="bos-movement-score"
          className="text-3xl font-bold text-white"
          aria-label={`Bio Optimization Score ${Math.round(state.score)}`}
        >
          {Math.round(state.score)}
        </span>
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {sentenceCase(tierLabel)}
        </span>
      </div>
      {/* Honest note: no fabricated movement when baseline is unknown */}
      <p
        data-testid="bos-movement-baseline-pending"
        className="text-xs text-white/45"
      >
        Baseline pending. Movement will appear once your baseline is established.
      </p>
    </div>
  );
}

function ReadyState({
  state,
}: {
  state: Extract<BOSMovementState, { kind: 'ready' }>;
}) {
  const color = colorForScore(state.score);
  const tierLabel = labelForScore(state.score);
  const label = movementLabel(state);

  const MovementIcon =
    state.direction === 'up'
      ? TrendingUp
      : state.direction === 'down'
        ? TrendingDown
        : Minus;

  // Teal for up/steady, Orange for down (matches design token emphasis rules)
  const movementColor =
    state.direction === 'up'
      ? '#2DA5A0'
      : state.direction === 'down'
        ? '#B75E18'
        : 'rgba(255,255,255,0.55)';

  return (
    <div className="flex flex-col gap-2">
      {/* Score row */}
      <div className="flex items-baseline gap-2">
        <span
          data-testid="bos-movement-score"
          className="text-3xl font-bold text-white"
          aria-label={`Bio Optimization Score ${Math.round(state.score)}`}
        >
          {Math.round(state.score)}
        </span>
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {sentenceCase(tierLabel)}
        </span>
      </div>

      {/* Movement row: "up N since baseline" / "down N" / "holding steady" */}
      <div
        data-testid="bos-movement-direction"
        className="flex items-center gap-1.5"
        aria-label={label}
      >
        <MovementIcon
          size={14}
          strokeWidth={1.5}
          style={{ color: movementColor }}
          aria-hidden="true"
        />
        <span
          className="text-xs font-medium"
          style={{ color: movementColor }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point)
// Connections BOS SSOT only. Fail-open:
//   loading snapshot -> loading skeleton
//   UNKNOWN / null   -> no-score (honest-disabled)
//   numeric display  -> computeBOSMovement (no CAQ composite in this slot)
// ---------------------------------------------------------------------------

export function BOSMovementReadout({ reducedMotion }: BOSMovementReadoutProps) {
  const snapshot = useWearableTilesSnapshot();
  const score = connectionsBosNumericScore(
    resolveConnectionsBosDisplay(namedWearableContributorCount(snapshot.scoreDetail)),
  );
  const bosState: BOSMovementState | 'loading' =
    snapshot.status === 'loading'
      ? 'loading'
      : computeBOSMovement(score, null);

  return <BOSMovementReadoutContent state={bosState} reducedMotion={reducedMotion} />;
}
