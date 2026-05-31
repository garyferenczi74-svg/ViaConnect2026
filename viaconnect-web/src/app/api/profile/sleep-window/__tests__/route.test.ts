// Prompt 171b Phase 3: tests for the sleep window endpoint.
// Validates Zod input contract + canonical time normalization on both
// directions (Postgres TIME -> HH:MM for the client, HH:MM -> HH:MM:SS
// for the database write).

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const TIME_RX = /^\d{2}:\d{2}$/;
const TIME_SCHEMA = z.string().regex(TIME_RX, 'expected HH:MM');

const PutSchema = z.object({
  sleep_start: TIME_SCHEMA,
  sleep_wake: TIME_SCHEMA,
});

function normalizeTimeFromPg(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const m = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

describe('PUT /api/profile/sleep-window Zod schema', () => {
  it('accepts valid HH:MM 24-hour times', () => {
    expect(PutSchema.safeParse({ sleep_start: '23:00', sleep_wake: '07:00' }).success).toBe(true);
    expect(PutSchema.safeParse({ sleep_start: '00:00', sleep_wake: '23:59' }).success).toBe(true);
    expect(PutSchema.safeParse({ sleep_start: '04:30', sleep_wake: '12:15' }).success).toBe(true);
  });

  it('rejects 12-hour AM/PM format', () => {
    expect(PutSchema.safeParse({ sleep_start: '11:00 PM', sleep_wake: '7:00 AM' }).success).toBe(false);
  });

  it('rejects single-digit hour without leading zero', () => {
    expect(PutSchema.safeParse({ sleep_start: '7:00', sleep_wake: '23:00' }).success).toBe(false);
  });

  it('rejects HH:MM:SS shape (we accept on the read path, not the write)', () => {
    expect(PutSchema.safeParse({ sleep_start: '23:00:00', sleep_wake: '07:00:00' }).success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(PutSchema.safeParse({ sleep_start: '23:00' }).success).toBe(false);
    expect(PutSchema.safeParse({ sleep_wake: '07:00' }).success).toBe(false);
    expect(PutSchema.safeParse({}).success).toBe(false);
  });

  it('tolerates wake_time earlier than bedtime (window wraps midnight)', () => {
    // This is the normal case for most users (bedtime 23:00 + wake 07:00).
    expect(PutSchema.safeParse({ sleep_start: '23:00', sleep_wake: '07:00' }).success).toBe(true);
    // Also valid for shift workers (bedtime 06:00 + wake 14:00).
    expect(PutSchema.safeParse({ sleep_start: '06:00', sleep_wake: '14:00' }).success).toBe(true);
    // Also valid for night owls (bedtime 02:00 + wake 10:00).
    expect(PutSchema.safeParse({ sleep_start: '02:00', sleep_wake: '10:00' }).success).toBe(true);
  });
});

describe('normalizeTimeFromPg helper', () => {
  it('trims HH:MM:SS to HH:MM', () => {
    expect(normalizeTimeFromPg('23:00:00')).toBe('23:00');
    expect(normalizeTimeFromPg('04:30:00')).toBe('04:30');
  });

  it('preserves HH:MM format unchanged', () => {
    expect(normalizeTimeFromPg('23:00')).toBe('23:00');
    expect(normalizeTimeFromPg('07:00')).toBe('07:00');
  });

  it('returns null on empty string + null + undefined', () => {
    expect(normalizeTimeFromPg(null)).toBeNull();
    expect(normalizeTimeFromPg(undefined)).toBeNull();
    expect(normalizeTimeFromPg('')).toBeNull();
  });

  it('returns null on malformed input', () => {
    expect(normalizeTimeFromPg('7:00')).toBeNull();
    expect(normalizeTimeFromPg('23')).toBeNull();
    expect(normalizeTimeFromPg('abc')).toBeNull();
    expect(normalizeTimeFromPg('23:00:00:00')).toBeNull();
  });
});
