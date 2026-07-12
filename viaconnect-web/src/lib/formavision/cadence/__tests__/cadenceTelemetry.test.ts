// Prompt 211a W4-2 - Tests for cadenceTelemetry.ts (pure payload + bucketing).
// The emit function itself is fail-open IO (not unit-tested here); the pure
// builder and the coarse score bucketing are.

import { describe, it, expect } from 'vitest';
import {
  buildCadenceEventPayload,
  bucketConsistencyScore,
  ALL_CADENCE_EVENTS,
} from '../cadenceTelemetry';

describe('cadenceTelemetry pure helpers', () => {
  it('exposes exactly three coarse events', () => {
    expect(ALL_CADENCE_EVENTS).toHaveLength(3);
    expect(ALL_CADENCE_EVENTS).toContain('formavision.reminder_opt_in');
    expect(ALL_CADENCE_EVENTS).toContain('formavision.streak_length');
    expect(ALL_CADENCE_EVENTS).toContain('formavision.fingerprint_consistency_score');
  });

  it('builds a payload with the default composition page and passed properties', () => {
    const payload = buildCadenceEventPayload('formavision.streak_length', { streakLength: 5, milestone: 'week' });
    expect(payload.event).toBe('formavision.streak_length');
    expect(payload.page).toBe('/body-tracker/composition');
    expect(payload.properties).toEqual({ streakLength: 5, milestone: 'week' });
  });

  it('buckets a consistency score coarsely and maps null to unknown (PII-clean)', () => {
    expect(bucketConsistencyScore(null)).toBe('unknown');
    expect(bucketConsistencyScore(0.1)).toBe('low');
    expect(bucketConsistencyScore(0.5)).toBe('medium');
    expect(bucketConsistencyScore(0.95)).toBe('high');
    // Boundaries.
    expect(bucketConsistencyScore(0.34)).toBe('medium');
    expect(bucketConsistencyScore(0.67)).toBe('high');
  });
});
