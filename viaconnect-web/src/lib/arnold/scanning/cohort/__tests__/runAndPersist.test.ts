// Prompt 211b Workstream 1A -- TDD tests for runAndPersist.ts.
//
// Tests the run-and-persist path with a mocked DB.
// RED first (written before implementation), then GREEN.
//
// Covers:
//   1. Happy path: rows loaded -> runValidation called -> report persisted.
//   2. Mocked DB insert receives the correct payload shape.
//   3. skippedRows and totalSamples are correct.
//   4. Empty measurement set produces an unproven report that is still persisted.
//   5. held_out_pass in the DB insert matches report.heldOutPass.

import { describe, it, expect, vi } from 'vitest';
import { runCohortValidationAndPersist } from '../runAndPersist';
import type { CohortDb } from '../runAndPersist';
import type { CohortMeasurementRow } from '../cohortLoader';
import { CALIBRATION_VERSION } from '../../accuracy/calibrationConfig';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRow(id: string, region: string, predicted: number, truth: number): CohortMeasurementRow {
  return {
    id,
    subject_id:   'subj-1',
    region,
    predicted_cm: predicted,
    truth_cm:     truth,
    sex:          'female',
  };
}

/** Build a mock CohortDb with controllable fetchMeasurements response. */
function mockDb(rows: CohortMeasurementRow[]): CohortDb {
  return {
    fetchMeasurements: vi.fn().mockResolvedValue(rows),
    insertValidationRun: vi.fn().mockResolvedValue({ id: 'run-uuid-1' }),
  };
}

// ---------------------------------------------------------------------------
// 1. Happy path
// ---------------------------------------------------------------------------

describe('runCohortValidationAndPersist: happy path', () => {
  it('fetches measurements and returns a PersistResult with a runId', async () => {
    const db = mockDb([
      makeRow('r1', 'waist', 82.0, 80.0),
      makeRow('r2', 'hip',   96.0, 95.0),
    ]);
    const result = await runCohortValidationAndPersist(db);
    expect(result.runId).toBe('run-uuid-1');
  });

  it('calls fetchMeasurements exactly once', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    await runCohortValidationAndPersist(db);
    expect(db.fetchMeasurements).toHaveBeenCalledOnce();
  });

  it('calls insertValidationRun exactly once', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    await runCohortValidationAndPersist(db);
    expect(db.insertValidationRun).toHaveBeenCalledOnce();
  });

  it('report in the result contains perRegion for the supplied regions', async () => {
    const db = mockDb([
      makeRow('r1', 'waist', 82.0, 80.0),
      makeRow('r2', 'waist', 83.0, 81.0),
    ]);
    const result = await runCohortValidationAndPersist(db);
    expect(result.report.perRegion.waist).toBeDefined();
  });

  it('passes optional notes to insertValidationRun', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    const notes = 'pilot batch July 2026';
    await runCohortValidationAndPersist(db, notes);
    const call = (db.insertValidationRun as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.notes).toBe(notes);
  });
});

// ---------------------------------------------------------------------------
// 2. Insert payload shape
// ---------------------------------------------------------------------------

describe('runCohortValidationAndPersist: DB insert payload', () => {
  it('insert payload includes calibration_version matching CALIBRATION_VERSION', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    await runCohortValidationAndPersist(db);
    const payload = (db.insertValidationRun as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.calibration_version).toBe(CALIBRATION_VERSION);
  });

  it('insert payload includes a run_at ISO string', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    await runCohortValidationAndPersist(db);
    const payload = (db.insertValidationRun as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(typeof payload.run_at).toBe('string');
    // ISO 8601 check: starts with YYYY-
    expect(payload.run_at).toMatch(/^\d{4}-/);
  });

  it('insert payload includes the ValidationReport object', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    await runCohortValidationAndPersist(db);
    const payload = (db.insertValidationRun as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.report).toBeDefined();
    expect(typeof payload.report.cohortStatus).toBe('string');
    expect(typeof payload.report.heldOutPass).toBe('boolean');
  });

  it('held_out_pass in insert payload matches report.heldOutPass', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    const result = await runCohortValidationAndPersist(db);
    const payload = (db.insertValidationRun as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.held_out_pass).toBe(result.report.heldOutPass);
  });
});

// ---------------------------------------------------------------------------
// 3. skippedRows and totalSamples
// ---------------------------------------------------------------------------

describe('runCohortValidationAndPersist: row counts', () => {
  it('totalSamples is the number of valid rows', async () => {
    const db = mockDb([
      makeRow('r1', 'waist', 82.0, 80.0),
      makeRow('r2', 'hip',   96.0, 95.0),
    ]);
    const result = await runCohortValidationAndPersist(db);
    expect(result.totalSamples).toBe(2);
  });

  it('skippedRows is 0 when all rows are valid', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    const result = await runCohortValidationAndPersist(db);
    expect(result.skippedRows).toBe(0);
  });

  it('skippedRows counts rows with predicted_cm=0', async () => {
    const rows: CohortMeasurementRow[] = [
      makeRow('r1', 'waist', 82.0, 80.0),
      { ...makeRow('r2', 'waist', 0, 80.0) },
    ];
    const db = mockDb(rows);
    const result = await runCohortValidationAndPersist(db);
    expect(result.skippedRows).toBe(1);
    expect(result.totalSamples).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Empty measurement set
// ---------------------------------------------------------------------------

describe('runCohortValidationAndPersist: empty DB', () => {
  it('still calls insertValidationRun with an unproven report', async () => {
    const db = mockDb([]);
    const result = await runCohortValidationAndPersist(db);
    expect(db.insertValidationRun).toHaveBeenCalledOnce();
    expect(result.report.cohortStatus).toBe('unproven');
    expect(result.report.heldOutPass).toBe(false);
    expect(result.totalSamples).toBe(0);
  });

  it('runId is returned even for an empty cohort', async () => {
    const db = mockDb([]);
    const result = await runCohortValidationAndPersist(db);
    expect(result.runId).toBe('run-uuid-1');
  });
});

// ---------------------------------------------------------------------------
// 5. held_out_pass alignment
// ---------------------------------------------------------------------------

describe('runCohortValidationAndPersist: held_out_pass alignment', () => {
  it('held_out_pass is false for a tiny sample (< MINIMUM_SAMPLES_PER_REGION)', async () => {
    const db = mockDb([makeRow('r1', 'waist', 82.0, 80.0)]);
    const result = await runCohortValidationAndPersist(db);
    expect(result.report.heldOutPass).toBe(false);
    const payload = (db.insertValidationRun as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.held_out_pass).toBe(false);
  });
});
