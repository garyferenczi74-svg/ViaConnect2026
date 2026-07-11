// Prompt 211a W4-2 - Tests for timeOfDay.ts (pure bucketing).

import { describe, it, expect } from 'vitest';
import { bucketHour, timeOfDayFromTimestamp } from '../timeOfDay';

describe('bucketHour', () => {
  it('maps hours to the expected buckets', () => {
    expect(bucketHour(7)).toBe('morning');
    expect(bucketHour(11)).toBe('morning');
    expect(bucketHour(12)).toBe('afternoon');
    expect(bucketHour(16)).toBe('afternoon');
    expect(bucketHour(17)).toBe('evening');
    expect(bucketHour(20)).toBe('evening');
    expect(bucketHour(21)).toBe('night');
    expect(bucketHour(2)).toBe('night');
  });

  it('is total: out-of-range or non-finite hours fall back to morning without throwing', () => {
    expect(bucketHour(Number.NaN)).toBe('morning');
    expect(bucketHour(-1)).toBe('night'); // wraps to 23 -> night
    expect(bucketHour(30)).toBe('morning'); // wraps to 6 -> morning
  });
});

describe('timeOfDayFromTimestamp', () => {
  it('buckets a Date by its local hour', () => {
    const morning = new Date(2026, 6, 10, 8, 0, 0);
    expect(timeOfDayFromTimestamp(morning)).toBe('morning');
    const evening = new Date(2026, 6, 10, 19, 0, 0);
    expect(timeOfDayFromTimestamp(evening)).toBe('evening');
  });

  it('falls back to morning on an unparseable string rather than throwing', () => {
    expect(timeOfDayFromTimestamp('not-a-date')).toBe('morning');
  });
});
