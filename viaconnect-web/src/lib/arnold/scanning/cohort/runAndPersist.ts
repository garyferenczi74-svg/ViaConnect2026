// Prompt 211b Workstream 1A -- run validation and persist the report.
//
// This module loads cohort_labeled_measurements, calls runValidation(), and
// writes the resulting ValidationReport into cohort_validation_runs. The DB
// client is injected so tests mock it at the boundary.
//
// Intended callers:
//   - A server action (admin-gated) that triggers a new validation run.
//   - A CLI script (scripts/runCohortValidation.ts) that the team uses once
//     real data is collected.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency.

import { rowsToLabeledSamples } from './cohortLoader';
import type { CohortMeasurementRow } from './cohortLoader';
import { runValidation } from '../accuracy/validationHarness';
import type { ValidationReport } from '../accuracy/validationHarness';
import { CALIBRATION_VERSION } from '../accuracy/calibrationConfig';

// ---------------------------------------------------------------------------
// DB interface (injected; allows mocking in tests)
// ---------------------------------------------------------------------------

/**
 * Minimal DB interface required by runAndPersist.
 * The real implementation passes a Supabase client; tests pass a mock.
 */
export interface CohortDb {
  /** Load all labeled measurements, optionally joined with subject sex. */
  fetchMeasurements(): Promise<CohortMeasurementRow[]>;
  /**
   * Write one validation run row.
   * Returns the newly created row's id.
   */
  insertValidationRun(run: {
    run_at: string;
    calibration_version: string;
    report: ValidationReport;
    held_out_pass: boolean;
    notes: string | null;
  }): Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface PersistResult {
  /** The UUID of the newly inserted cohort_validation_runs row. */
  runId: string;
  /** The full ValidationReport that was produced and persisted. */
  report: ValidationReport;
  /** Number of rows skipped (non-positive cm values -- should be 0). */
  skippedRows: number;
  /** Total labeled samples sent to runValidation(). */
  totalSamples: number;
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/**
 * Load labeled measurements -> run the harness -> persist the report.
 *
 * This is the single runnable path that a real batch executes the moment
 * data exists. The caller provides a CohortDb implementation so the function
 * stays pure/testable and the real Supabase client stays out of this module.
 *
 * @param db     - Injected DB implementation.
 * @param notes  - Optional free-text note for the validation_runs row.
 * @returns PersistResult with the new run's id and the full report.
 */
export async function runCohortValidationAndPersist(
  db: CohortDb,
  notes: string | null = null,
): Promise<PersistResult> {
  const rows = await db.fetchMeasurements();
  const { samples, skipped } = rowsToLabeledSamples(rows);

  const report = runValidation(samples);

  const runAt = new Date().toISOString();
  const inserted = await db.insertValidationRun({
    run_at:               runAt,
    calibration_version:  CALIBRATION_VERSION,
    report,
    held_out_pass:        report.heldOutPass,
    notes,
  });

  return {
    runId:        inserted.id,
    report,
    skippedRows:  skipped,
    totalSamples: samples.length,
  };
}
