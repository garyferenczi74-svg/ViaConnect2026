/**
 * src/lib/formavision/bos/bosMovement.ts
 *
 * Prompt 210b P6-T3: BOS movement pure logic.
 *
 * Maps score + baseline from BOSCurrentResponse into a typed movement state
 * for the BOSMovementReadout component.
 *
 * Movement = score - baseline, framed "since baseline".
 * This is the ONLY honest delta we can surface without a new data path:
 * there is no per-scan delta endpoint, and adding one would violate the
 * 210b "no second data path" invariant. The "since baseline" framing is
 * correct because baseline comes from caq.baseline_score (a persisted
 * value), and score is the latest computed BOS from /api/bos/current.
 *
 * No imports from Supabase, Anthropic, or any network module.
 * Pure types + pure functions only.
 *
 * 2026-06-27. No em/en dashes.
 */

export type BOSMovementDirection = 'up' | 'down' | 'steady';

/**
 * Discriminated union of all possible BOS movement states.
 *
 *   no-score    score is null (BOS not yet computed). Render honest-disabled.
 *   no-baseline score present, baseline null (baseline not yet established).
 *               Show score without a movement delta.
 *   ready       Both score and baseline are non-null. Show score + movement.
 */
export type BOSMovementState =
  | { kind: 'no-score' }
  | { kind: 'no-baseline'; score: number }
  | {
      kind: 'ready';
      score: number;
      baseline: number;
      /** score - baseline, rounded to 1 decimal to absorb float noise. */
      delta: number;
      direction: BOSMovementDirection;
    };

/**
 * Compute the BOS movement state from raw score and baseline.
 *
 * delta = score - baseline.
 *   positive delta -> 'up' (score is above baseline)
 *   negative delta -> 'down' (score is below baseline)
 *   zero delta     -> 'steady'
 *
 * Delta is rounded to 1 decimal place to absorb floating-point noise.
 * This function NEVER fabricates a per-scan delta; the only delta it
 * computes is score vs. baseline from the same SSOT response.
 */
export function computeBOSMovement(
  score: number | null,
  baseline: number | null,
): BOSMovementState {
  if (score === null) return { kind: 'no-score' };
  if (baseline === null) return { kind: 'no-baseline', score };
  const rawDelta = score - baseline;
  // Round to 1 dp to prevent 0.1 + 0.2 = 0.30000000000000004 type noise.
  const delta = Math.round(rawDelta * 10) / 10;
  const direction: BOSMovementDirection =
    delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady';
  return { kind: 'ready', score, baseline, delta, direction };
}

/**
 * Format the absolute delta magnitude for display.
 * Drops trailing zero: 15 -> "15", 3.5 -> "3.5".
 */
export function formatMagnitude(delta: number): string {
  return parseFloat(Math.abs(delta).toFixed(1)).toString();
}

/**
 * Human-readable movement label for a ready state.
 *
 * Examples:
 *   up 15 since baseline
 *   down 3 since baseline
 *   holding steady since baseline
 *
 * The "since baseline" suffix is intentional: it frames the delta
 * against the stored caq.baseline_score, NOT against the previous
 * scan. This avoids any fabricated "this scan moved it by N" claim.
 */
export function movementLabel(
  state: Extract<BOSMovementState, { kind: 'ready' }>,
): string {
  const mag = formatMagnitude(state.delta);
  if (state.direction === 'up') return `up ${mag} since baseline`;
  if (state.direction === 'down') return `down ${mag} since baseline`;
  return 'holding steady since baseline';
}
