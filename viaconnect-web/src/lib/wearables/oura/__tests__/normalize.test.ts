import { describe, it, expect } from 'vitest';
import { normalizeOuraRecovery, normalizeOuraSleep } from '../normalize';

describe('Oura normalize', () => {
  it('maps daily sleep without inventing zeros', () => {
    const row = normalizeOuraSleep('u-1', {
      id: 'sleep-1',
      bedtime_start: '2026-08-20T02:00:00.000Z',
      bedtime_end: '2026-08-20T10:00:00.000Z',
      total_sleep_duration: 27000,
      rem_sleep_duration: 5400,
      score: 86,
    });
    expect(row.source_provider).toBe('oura');
    expect(row.total_sleep_min).toBe(450);
    expect(row.sleep_efficiency_pct).toBe(86);
    expect(row.respiratory_rate).toBeNull();
  });

  it('maps readiness to recovery and leaves missing HRV null', () => {
    const row = normalizeOuraRecovery('u-1', {
      id: 'ready-1',
      day: '2026-08-20',
      score: 81,
      contributors: {},
    });
    expect(row.recovery_score).toBe(81);
    expect(row.hrv_ms).toBeNull();
    expect(row.spo2_pct).toBeNull();
  });
});
