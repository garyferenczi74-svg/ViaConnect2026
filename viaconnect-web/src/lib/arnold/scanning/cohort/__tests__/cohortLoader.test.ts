// Prompt 211b Workstream 1A -- TDD tests for cohortLoader.ts.
//
// Tests the DB row -> LabeledSample[] mapping.
// RED first (written before implementation), then GREEN.
//
// Covers:
//   1. Valid rows map to LabeledSample correctly.
//   2. Sex 'male' / 'female' propagates; 'other' and null are omitted.
//   3. Non-positive cm values are skipped (counted in skipped).
//   4. An unrecognised region throws CohortLoaderError.
//   5. Empty input returns empty samples + 0 skipped.

import { describe, it, expect } from 'vitest';
import {
  rowsToLabeledSamples,
  CohortLoaderError,
} from '../cohortLoader';
import type { CohortMeasurementRow } from '../cohortLoader';
import type { GirthRegion } from '../../accuracy/accuracyTargets';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<CohortMeasurementRow> = {}): CohortMeasurementRow {
  return {
    id:           'row-1',
    subject_id:   'subj-1',
    region:       'waist',
    predicted_cm: 82.5,
    truth_cm:     80.0,
    sex:          null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Valid rows map correctly
// ---------------------------------------------------------------------------

describe('rowsToLabeledSamples: valid rows', () => {
  it('maps predicted_cm -> predictedCm and truth_cm -> truthCm', () => {
    const row = makeRow({ predicted_cm: 90.0, truth_cm: 88.5 });
    const { samples } = rowsToLabeledSamples([row]);
    expect(samples).toHaveLength(1);
    expect(samples[0].predictedCm).toBe(90.0);
    expect(samples[0].truthCm).toBe(88.5);
  });

  it('maps region string to GirthRegion', () => {
    const regions: GirthRegion[] = [
      'neck', 'upperArm', 'forearm', 'upperLeg', 'lowerLeg', 'chest', 'waist', 'hip',
    ];
    for (const region of regions) {
      const { samples } = rowsToLabeledSamples([makeRow({ region })]);
      expect(samples[0].region).toBe(region);
    }
  });

  it('returns skipped=0 when all rows are valid', () => {
    const { skipped } = rowsToLabeledSamples([makeRow(), makeRow({ id: 'row-2' })]);
    expect(skipped).toBe(0);
  });

  it('returns all samples for an input with multiple regions', () => {
    const rows: CohortMeasurementRow[] = [
      makeRow({ id: 'r1', region: 'waist', predicted_cm: 80, truth_cm: 78 }),
      makeRow({ id: 'r2', region: 'hip',   predicted_cm: 95, truth_cm: 93 }),
      makeRow({ id: 'r3', region: 'neck',  predicted_cm: 36, truth_cm: 35 }),
    ];
    const { samples } = rowsToLabeledSamples(rows);
    expect(samples).toHaveLength(3);
    expect(samples.map(s => s.region)).toEqual(['waist', 'hip', 'neck']);
  });
});

// ---------------------------------------------------------------------------
// 2. Sex propagation
// ---------------------------------------------------------------------------

describe('rowsToLabeledSamples: sex field', () => {
  it('propagates sex=male to LabeledSample.sex', () => {
    const { samples } = rowsToLabeledSamples([makeRow({ sex: 'male' })]);
    expect(samples[0].sex).toBe('male');
  });

  it('propagates sex=female to LabeledSample.sex', () => {
    const { samples } = rowsToLabeledSamples([makeRow({ sex: 'female' })]);
    expect(samples[0].sex).toBe('female');
  });

  it('omits sex when the DB value is "other"', () => {
    const { samples } = rowsToLabeledSamples([makeRow({ sex: 'other' })]);
    expect(samples[0].sex).toBeUndefined();
  });

  it('omits sex when the DB value is null', () => {
    const { samples } = rowsToLabeledSamples([makeRow({ sex: null })]);
    expect(samples[0].sex).toBeUndefined();
  });

  it('omits sex when the DB value is undefined', () => {
    const row = makeRow();
    delete row.sex;
    const { samples } = rowsToLabeledSamples([row]);
    expect(samples[0].sex).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Non-positive cm values are skipped
// ---------------------------------------------------------------------------

describe('rowsToLabeledSamples: skipping invalid cm values', () => {
  it('skips a row where predicted_cm is 0', () => {
    const { samples, skipped } = rowsToLabeledSamples([
      makeRow({ id: 'bad', predicted_cm: 0 }),
    ]);
    expect(samples).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('skips a row where predicted_cm is negative', () => {
    const { samples, skipped } = rowsToLabeledSamples([
      makeRow({ id: 'bad', predicted_cm: -5 }),
    ]);
    expect(samples).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('skips a row where truth_cm is 0', () => {
    const { samples, skipped } = rowsToLabeledSamples([
      makeRow({ id: 'bad', truth_cm: 0 }),
    ]);
    expect(samples).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('skips a row where truth_cm is negative', () => {
    const { samples, skipped } = rowsToLabeledSamples([
      makeRow({ id: 'bad', truth_cm: -1 }),
    ]);
    expect(samples).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('counts multiple bad rows in skipped', () => {
    const { samples, skipped } = rowsToLabeledSamples([
      makeRow({ id: 'bad1', predicted_cm: 0 }),
      makeRow({ id: 'ok',   predicted_cm: 80, truth_cm: 78 }),
      makeRow({ id: 'bad2', truth_cm: -1 }),
    ]);
    expect(samples).toHaveLength(1);
    expect(skipped).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Unknown region throws CohortLoaderError
// ---------------------------------------------------------------------------

describe('rowsToLabeledSamples: invalid region', () => {
  it('throws CohortLoaderError for an unrecognised region string', () => {
    const row = makeRow({ id: 'row-bad', region: 'shoulder' });
    expect(() => rowsToLabeledSamples([row])).toThrow(CohortLoaderError);
  });

  it('CohortLoaderError.rowId is the offending row id', () => {
    const row = makeRow({ id: 'row-xyz', region: 'unknown_region' });
    let caught: CohortLoaderError | null = null;
    try {
      rowsToLabeledSamples([row]);
    } catch (e) {
      caught = e as CohortLoaderError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.rowId).toBe('row-xyz');
  });

  it('throws before processing any subsequent rows', () => {
    const rows: CohortMeasurementRow[] = [
      makeRow({ id: 'bad', region: 'INVALID' }),
      makeRow({ id: 'ok'  }),
    ];
    expect(() => rowsToLabeledSamples(rows)).toThrow(CohortLoaderError);
  });
});

// ---------------------------------------------------------------------------
// 5. Empty input
// ---------------------------------------------------------------------------

describe('rowsToLabeledSamples: empty input', () => {
  it('returns empty samples and skipped=0 for an empty array', () => {
    const { samples, skipped } = rowsToLabeledSamples([]);
    expect(samples).toHaveLength(0);
    expect(skipped).toBe(0);
  });
});
