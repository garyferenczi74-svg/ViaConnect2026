import { describe, it, expect } from 'vitest';
import { numOrNull, formatUnknownMetric } from '../types';
import {
  normalizeWhoopRecovery,
  normalizeWhoopSleep,
  normalizeWhoopWorkout,
} from '../whoop/normalize';
import { groupDailyVitals, extractBodyComposition } from '../normalize-health';
import { pickByPrecedence } from '../precedence';

describe('numOrNull / UNKNOWN', () => {
  it('never fabricates 0 for missing values', () => {
    expect(numOrNull(null)).toBeNull();
    expect(numOrNull(undefined)).toBeNull();
    expect(numOrNull('')).toBeNull();
    expect(numOrNull('nope')).toBeNull();
    expect(numOrNull(0)).toBe(0); // real zero is allowed
    expect(formatUnknownMetric(null)).toBe('UNKNOWN');
    expect(formatUnknownMetric(undefined)).toBe('UNKNOWN');
  });
});

describe('WHOOP normalize', () => {
  it('maps sleep with null stages when absent', () => {
    const row = normalizeWhoopSleep('u1', {
      id: 'sleep-1',
      start: '2026-08-01T00:00:00Z',
      end: '2026-08-01T07:00:00Z',
      score: {},
    });
    expect(row.external_id).toBe('sleep-1');
    expect(row.rem_min).toBeNull();
    expect(row.deep_min).toBeNull();
    expect(row.total_sleep_min).toBeNull();
  });

  it('maps recovery HRV when present, null when missing', () => {
    const withHrv = normalizeWhoopRecovery('u1', {
      cycle_id: 'c1',
      created_at: '2026-08-01T08:00:00Z',
      score: { hrv_rmssd_milli: 42, recovery_score: 67 },
    });
    expect(withHrv.hrv_ms).toBe(42);
    expect(withHrv.recovery_score).toBe(67);

    const partial = normalizeWhoopRecovery('u1', {
      cycle_id: 'c2',
      created_at: '2026-08-02T08:00:00Z',
      score: {},
    });
    expect(partial.hrv_ms).toBeNull();
    expect(partial.resting_hr_bpm).toBeNull();
  });

  it('maps workout strain without inventing distance', () => {
    const row = normalizeWhoopWorkout('u1', {
      id: 'w1',
      start: '2026-08-01T12:00:00Z',
      end: '2026-08-01T13:00:00Z',
      score: { strain: 8.2, average_heart_rate: 140 },
    });
    expect(row.strain).toBe(8.2);
    expect(row.distance_m).toBeNull();
  });
});

describe('health normalize', () => {
  it('groups vitals by day without zeroing missing metrics', () => {
    const rows = groupDailyVitals('u1', 'health_kit', [
      { type: 'steps', value: 5000, startDate: '2026-08-01T10:00:00Z', sourceApp: 'Hume' },
      { type: 'hrv', value: 55, startDate: '2026-08-01T08:00:00Z', sourceApp: 'Hume' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].steps).toBe(5000);
    expect(rows[0].hrv_ms).toBe(55);
    expect(rows[0].resting_hr_bpm).toBeNull();
    expect(rows[0].source_app).toBe('Hume');
  });

  it('extracts body composition without inventing water_pct', () => {
    const rows = extractBodyComposition('u1', 'health_kit', [
      { type: 'bodyMass', value: 80, startDate: '2026-08-01T09:00:00Z', sourceApp: 'Hume' },
      { type: 'bodyFatPercentage', value: 18, startDate: '2026-08-01T09:00:00Z' },
    ]);
    expect(rows[0].weight_kg).toBe(80);
    expect(rows[0].body_fat_pct).toBe(18);
    expect(rows[0].water_pct).toBeNull();
  });
});

describe('precedence', () => {
  it('returns preferred provider only when present', () => {
    const rows = [
      { source_provider: 'health_kit', hrv_ms: 40 },
      { source_provider: 'whoop', hrv_ms: 55 },
    ];
    const picked = pickByPrecedence(rows, 'whoop');
    expect(picked?.source_provider).toBe('whoop');
    expect(picked?.hrv_ms).toBe(55);
  });

  it('falls back when preferred has no row', () => {
    const rows = [{ source_provider: 'health_kit', hrv_ms: 40 }];
    const picked = pickByPrecedence(rows, 'whoop');
    expect(picked?.source_provider).toBe('health_kit');
  });
});
