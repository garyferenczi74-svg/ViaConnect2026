// Task 211b-W3b - TDD tests for anchor ingestion + consent gate.

import { describe, it, expect } from 'vitest';
import {
  scaleAnchorFromBodyTrackerWeightRow,
  scaleAnchorFromBodyCompositionReadingRow,
  anchorFromUserMeasurementAnchorRow,
  buildScaleAnchorsFromWeightRows,
  buildScaleAnchorsFromCompositionReadings,
  buildTapeDexaAnchors,
  hasActiveConsent,
  readAnchorsFailOpen,
  type ScaleWeightRow,
  type BodyCompositionWeightRow,
  type UserMeasurementAnchorRow,
  type ConsentLedgerRow,
} from '../anchorIngestion';

// ---------------------------------------------------------------------------
// Scale anchors: body_tracker_weight
// ---------------------------------------------------------------------------

describe('scaleAnchorFromBodyTrackerWeightRow', () => {
  it('converts lbs to kg and stamps medium reliability', () => {
    const row: ScaleWeightRow = { weight_lbs: 180, created_at: '2026-07-01T00:00:00.000Z' };
    const anchor = scaleAnchorFromBodyTrackerWeightRow(row);
    expect(anchor).toEqual({
      source: 'scale',
      region: 'weight',
      value: 81.65,
      takenAt: '2026-07-01T00:00:00.000Z',
      statedReliability: 'medium',
    });
  });

  it('drops a null weight row rather than fabricating a value', () => {
    const row: ScaleWeightRow = { weight_lbs: null, created_at: '2026-07-01T00:00:00.000Z' };
    expect(scaleAnchorFromBodyTrackerWeightRow(row)).toBeNull();
  });

  it('drops a non-positive weight row', () => {
    const row: ScaleWeightRow = { weight_lbs: 0, created_at: '2026-07-01T00:00:00.000Z' };
    expect(scaleAnchorFromBodyTrackerWeightRow(row)).toBeNull();
  });
});

describe('buildScaleAnchorsFromWeightRows', () => {
  it('maps valid rows and silently skips unmappable ones', () => {
    const rows: ScaleWeightRow[] = [
      { weight_lbs: 150, created_at: '2026-07-01T00:00:00.000Z' },
      { weight_lbs: null, created_at: '2026-07-02T00:00:00.000Z' },
    ];
    const anchors = buildScaleAnchorsFromWeightRows(rows);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].source).toBe('scale');
  });
});

// ---------------------------------------------------------------------------
// Scale anchors: body_composition_readings (unit-aware)
// ---------------------------------------------------------------------------

describe('scaleAnchorFromBodyCompositionReadingRow', () => {
  it('passes through a kg reading unchanged', () => {
    const row: BodyCompositionWeightRow = { value: 75, unit: 'kg', measured_at: '2026-07-01T00:00:00.000Z' };
    const anchor = scaleAnchorFromBodyCompositionReadingRow(row);
    expect(anchor?.value).toBe(75);
  });

  it('converts an lb reading to kg', () => {
    const row: BodyCompositionWeightRow = { value: 100, unit: 'lb', measured_at: '2026-07-01T00:00:00.000Z' };
    const anchor = scaleAnchorFromBodyCompositionReadingRow(row);
    expect(anchor?.value).toBeCloseTo(45.36, 2);
  });

  it('drops an unrecognized unit rather than guessing', () => {
    const row: BodyCompositionWeightRow = { value: 75, unit: 'stone', measured_at: '2026-07-01T00:00:00.000Z' };
    expect(scaleAnchorFromBodyCompositionReadingRow(row)).toBeNull();
  });
});

describe('buildScaleAnchorsFromCompositionReadings', () => {
  it('maps only the rows with a recognized unit', () => {
    const rows: BodyCompositionWeightRow[] = [
      { value: 75, unit: 'kg', measured_at: '2026-07-01T00:00:00.000Z' },
      { value: 75, unit: 'stone', measured_at: '2026-07-02T00:00:00.000Z' },
    ];
    expect(buildScaleAnchorsFromCompositionReadings(rows)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Tape / dexa anchors: user_measurement_anchors
// ---------------------------------------------------------------------------

describe('anchorFromUserMeasurementAnchorRow', () => {
  function row(overrides: Partial<UserMeasurementAnchorRow> = {}): UserMeasurementAnchorRow {
    return {
      source: 'tape',
      region: 'waist_natural',
      value_cm: 81.5,
      weight_kg: null,
      stated_reliability: 'medium',
      taken_at: '2026-07-01T12:00:00.000Z',
      ...overrides,
    };
  }

  it('maps a valid tape row', () => {
    const anchor = anchorFromUserMeasurementAnchorRow(row());
    expect(anchor).toEqual({
      source: 'tape',
      region: 'waist_natural',
      value: 81.5,
      takenAt: '2026-07-01T12:00:00.000Z',
      statedReliability: 'medium',
    });
  });

  it('maps a valid dexa row with high reliability', () => {
    const anchor = anchorFromUserMeasurementAnchorRow(
      row({ source: 'dexa', region: 'hip', value_cm: 100.2, stated_reliability: 'high' }),
    );
    expect(anchor?.source).toBe('dexa');
    expect(anchor?.statedReliability).toBe('high');
  });

  it('drops a row whose source is scale (not this ingestion path)', () => {
    expect(anchorFromUserMeasurementAnchorRow(row({ source: 'scale' }))).toBeNull();
  });

  it('drops a row with an unrecognized region string', () => {
    expect(anchorFromUserMeasurementAnchorRow(row({ region: 'left_pinky_finger' }))).toBeNull();
  });

  it('drops a weight-only row (region null) from this circumference path', () => {
    expect(anchorFromUserMeasurementAnchorRow(row({ region: null, value_cm: null, weight_kg: 70 }))).toBeNull();
  });

  it('drops a row with a non-positive value', () => {
    expect(anchorFromUserMeasurementAnchorRow(row({ value_cm: 0 }))).toBeNull();
  });

  it('drops a row with an unrecognized stated_reliability', () => {
    expect(anchorFromUserMeasurementAnchorRow(row({ stated_reliability: 'very-high' }))).toBeNull();
  });
});

describe('buildTapeDexaAnchors', () => {
  it('maps valid rows and skips unmappable ones, preserving order', () => {
    const rows: UserMeasurementAnchorRow[] = [
      { source: 'tape', region: 'hip', value_cm: 95, weight_kg: null, stated_reliability: 'medium', taken_at: '2026-07-01T00:00:00.000Z' },
      { source: 'dexa', region: 'bogus', value_cm: 95, weight_kg: null, stated_reliability: 'high', taken_at: '2026-07-02T00:00:00.000Z' },
      { source: 'dexa', region: 'chest', value_cm: 102, weight_kg: null, stated_reliability: 'high', taken_at: '2026-07-03T00:00:00.000Z' },
    ];
    const anchors = buildTapeDexaAnchors(rows);
    expect(anchors).toHaveLength(2);
    expect(anchors.map(a => a.region)).toEqual(['hip', 'chest']);
  });
});

// ---------------------------------------------------------------------------
// Consent gate
// ---------------------------------------------------------------------------

describe('hasActiveConsent', () => {
  it('is false when no ledger row exists for the consent type', () => {
    expect(hasActiveConsent([], 'tape_anchor')).toBe(false);
  });

  it('is true when the latest row is granted and not revoked', () => {
    const ledger: ConsentLedgerRow[] = [
      { consent_type: 'tape_anchor', granted: true, granted_at: '2026-06-01T00:00:00.000Z', revoked_at: null },
    ];
    expect(hasActiveConsent(ledger, 'tape_anchor')).toBe(true);
  });

  it('is false when the latest row has been revoked', () => {
    const ledger: ConsentLedgerRow[] = [
      { consent_type: 'tape_anchor', granted: true, granted_at: '2026-06-01T00:00:00.000Z', revoked_at: '2026-06-15T00:00:00.000Z' },
    ];
    expect(hasActiveConsent(ledger, 'tape_anchor')).toBe(false);
  });

  it('uses only the most recent row when multiple exist for the same type', () => {
    const ledger: ConsentLedgerRow[] = [
      { consent_type: 'dexa_anchor', granted: true, granted_at: '2026-06-01T00:00:00.000Z', revoked_at: null },
      { consent_type: 'dexa_anchor', granted: false, granted_at: '2026-06-10T00:00:00.000Z', revoked_at: null },
    ];
    expect(hasActiveConsent(ledger, 'dexa_anchor')).toBe(false);
  });

  it('ignores rows for a different consent type', () => {
    const ledger: ConsentLedgerRow[] = [
      { consent_type: 'scale_anchor', granted: true, granted_at: '2026-06-01T00:00:00.000Z', revoked_at: null },
    ];
    expect(hasActiveConsent(ledger, 'tape_anchor')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fail-open read wrapper
// ---------------------------------------------------------------------------

describe('readAnchorsFailOpen', () => {
  it('passes through the reader result on success', async () => {
    const result = await readAnchorsFailOpen('test.success', async () => [1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns an empty list rather than throwing when the reader rejects', async () => {
    const result = await readAnchorsFailOpen('test.failure', async () => {
      throw new Error('simulated DB failure');
    });
    expect(result).toEqual([]);
  });
});
