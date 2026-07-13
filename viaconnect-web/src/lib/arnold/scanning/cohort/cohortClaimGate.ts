// Prompt 211b Workstream 1A -- accuracy claim gate.
//
// Reads the latest cohort_validation_runs row and returns a typed gated state.
// The measured accuracy claim is exposed ONLY when:
//   1. heldOutPass is true (harness passed on the held-out split), AND
//   2. garySignedOff is true (Gary manually set gary_signed_off=TRUE on the row).
//
// Under any other condition the gate returns 'unproven' with NO number.
// NEVER fabricate an accuracy figure. NEVER leak a number from a failed run.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency.

import type { ValidationReport } from '../accuracy/validationHarness';

// ---------------------------------------------------------------------------
// DB row shape (subset of cohort_validation_runs)
// ---------------------------------------------------------------------------

/**
 * The columns from cohort_validation_runs needed by the claim gate.
 * Only the latest row (ORDER BY run_at DESC LIMIT 1) is read.
 */
export interface LatestValidationRunRow {
  id: string;
  run_at: string;
  calibration_version: string;
  report: ValidationReport;
  held_out_pass: boolean;
  gary_signed_off: boolean;
}

// ---------------------------------------------------------------------------
// Gated accuracy state
// ---------------------------------------------------------------------------

/**
 * The gate is 'open' only when the harness passed the held-out split AND
 * Gary has signed off. All other cases return 'closed'.
 *
 * When 'open', accuracyClaim is the cohortStatus from the report -- consumers
 * must check that it is 'proven' before rendering any metric. No raw number
 * is surfaced here; callers read report.perRegion for individual metrics only
 * after confirming status === 'open'.
 *
 * When 'closed', accuracyClaim is 'unproven' and report is absent. Do NOT
 * render any accuracy figure in the 'closed' state.
 */
export type GatedAccuracyState =
  | {
      status: 'open';
      accuracyClaim: 'proven';
      runId: string;
      runAt: string;
      calibrationVersion: string;
      report: ValidationReport;
    }
  | {
      status: 'closed';
      accuracyClaim: 'unproven';
      reason: ClaimClosedReason;
    };

/**
 * Why the gate is closed. Honest, non-fabricated reasons only.
 *
 * 'no_run'          -- no validation run exists yet.
 * 'held_out_failed' -- the harness ran but the held-out split did not pass.
 * 'pending_sign_off'-- the held-out split passed but Gary has not signed off.
 */
export type ClaimClosedReason =
  | 'no_run'
  | 'held_out_failed'
  | 'pending_sign_off';

// ---------------------------------------------------------------------------
// DB interface
// ---------------------------------------------------------------------------

/**
 * DB interface for the claim gate. Injected so tests can mock it.
 */
export interface ClaimGateDb {
  /** Fetch the most recent cohort_validation_runs row, or null if none. */
  fetchLatestRun(): Promise<LatestValidationRunRow | null>;
}

// ---------------------------------------------------------------------------
// Public gate function
// ---------------------------------------------------------------------------

/**
 * Evaluate the accuracy claim gate from the latest validation run.
 *
 * Returns GatedAccuracyState:
 *   - status 'open'   only when heldOutPass && garySignedOff.
 *   - status 'closed' with an honest reason in all other cases.
 *
 * Callers rendering any accuracy surface MUST check state.status === 'open'
 * before displaying any metric. A 'closed' state must render
 * "validation pending / not yet proven" with NO number.
 *
 * @param db - Injected DB implementation.
 */
export async function evaluateClaimGate(db: ClaimGateDb): Promise<GatedAccuracyState> {
  const row = await db.fetchLatestRun();

  if (row === null) {
    return { status: 'closed', accuracyClaim: 'unproven', reason: 'no_run' };
  }

  if (!row.held_out_pass) {
    return { status: 'closed', accuracyClaim: 'unproven', reason: 'held_out_failed' };
  }

  if (!row.gary_signed_off) {
    return { status: 'closed', accuracyClaim: 'unproven', reason: 'pending_sign_off' };
  }

  // Both gates cleared. The accuracy claim is open.
  return {
    status:             'open',
    accuracyClaim:      'proven',
    runId:              row.id,
    runAt:              row.run_at,
    calibrationVersion: row.calibration_version,
    report:             row.report,
  };
}

// ---------------------------------------------------------------------------
// Honest placeholder text (for UI consumers)
// ---------------------------------------------------------------------------

/**
 * Returns the honest user-facing copy for a closed gate.
 * Never returns a number. Call this when state.status === 'closed'.
 *
 * @param reason - The ClaimClosedReason from the closed GatedAccuracyState.
 */
export function closedGateCopy(reason: ClaimClosedReason): string {
  switch (reason) {
    case 'no_run':
      return 'Accuracy validation has not yet been run. Collect a labeled cohort to begin.';
    case 'held_out_failed':
      return 'Accuracy validation is in progress. Results are not yet publishable.';
    case 'pending_sign_off':
      return 'Validation pending review. Accuracy figures will appear after sign-off.';
  }
}
