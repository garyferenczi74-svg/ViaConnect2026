import { describe, it, expect } from 'vitest';
import { groupSharesByPractitioner, computeExpiry } from '../photoShareGroup';
import type { ShareGroupRow } from '../photoShareGroup';

// Prompt 231b: groupSharesByPractitioner is the single place that collapses
// possibly-multiple photo_share_permissions rows per practitioner (account
// level sharing) into one ActivePhotoShare. computeExpiry is the date math
// grantPhotoShare relies on. Both are pure, so no supabase mocking here.

function row(overrides: Partial<ShareGroupRow>): ShareGroupRow {
  return {
    id: 'row-1',
    practitioner_id: 'pract-1',
    granted_at: '2026-08-01T00:00:00.000Z',
    expires_at: '2026-08-31T00:00:00.000Z',
    displayName: 'Dr. A',
    practiceName: 'Clinic A',
    ...overrides,
  };
}

describe('groupSharesByPractitioner', () => {
  it('returns one entry per distinct practitioner', () => {
    const result = groupSharesByPractitioner([
      row({ id: 'r1', practitioner_id: 'pract-1' }),
      row({ id: 'r2', practitioner_id: 'pract-2', displayName: 'Dr. B' }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.practitionerId).sort()).toEqual(['pract-1', 'pract-2']);
  });

  it('dedups multiple rows for the same practitioner, keeping all rowIds', () => {
    const result = groupSharesByPractitioner([
      row({ id: 'r1', practitioner_id: 'pract-1' }),
      row({ id: 'r2', practitioner_id: 'pract-1' }),
      row({ id: 'r3', practitioner_id: 'pract-1' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].rowIds.sort()).toEqual(['r1', 'r2', 'r3']);
  });

  it('takes the earliest grantedAt across duplicate rows', () => {
    const result = groupSharesByPractitioner([
      row({ id: 'r1', practitioner_id: 'pract-1', granted_at: '2026-08-15T00:00:00.000Z' }),
      row({ id: 'r2', practitioner_id: 'pract-1', granted_at: '2026-08-01T00:00:00.000Z' }),
      row({ id: 'r3', practitioner_id: 'pract-1', granted_at: '2026-08-20T00:00:00.000Z' }),
    ]);
    expect(result[0].grantedAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('takes the latest expiresAt across duplicate rows', () => {
    const result = groupSharesByPractitioner([
      row({ id: 'r1', practitioner_id: 'pract-1', expires_at: '2026-09-01T00:00:00.000Z' }),
      row({ id: 'r2', practitioner_id: 'pract-1', expires_at: '2026-09-30T00:00:00.000Z' }),
      row({ id: 'r3', practitioner_id: 'pract-1', expires_at: '2026-09-15T00:00:00.000Z' }),
    ]);
    expect(result[0].expiresAt).toBe('2026-09-30T00:00:00.000Z');
  });

  it('carries displayName and practiceName through unchanged', () => {
    const result = groupSharesByPractitioner([
      row({ displayName: 'Dr. Casey', practiceName: 'Casey Clinic' }),
    ]);
    expect(result[0].displayName).toBe('Dr. Casey');
    expect(result[0].practiceName).toBe('Casey Clinic');
  });

  it('sorts the result by displayName', () => {
    const result = groupSharesByPractitioner([
      row({ id: 'r1', practitioner_id: 'pract-z', displayName: 'Dr. Zeta' }),
      row({ id: 'r2', practitioner_id: 'pract-a', displayName: 'Dr. Alpha' }),
      row({ id: 'r3', practitioner_id: 'pract-m', displayName: 'Dr. Mid' }),
    ]);
    expect(result.map((r) => r.displayName)).toEqual(['Dr. Alpha', 'Dr. Mid', 'Dr. Zeta']);
  });

  it('returns an empty array for no rows', () => {
    expect(groupSharesByPractitioner([])).toEqual([]);
  });
});

describe('computeExpiry', () => {
  it('adds the given number of days to nowIso', () => {
    expect(computeExpiry('2026-08-01T00:00:00.000Z', 30)).toBe('2026-08-31T00:00:00.000Z');
  });

  it('handles 0 days as no change', () => {
    expect(computeExpiry('2026-08-01T00:00:00.000Z', 0)).toBe('2026-08-01T00:00:00.000Z');
  });

  it('handles a month rollover correctly', () => {
    expect(computeExpiry('2026-08-20T12:00:00.000Z', 15)).toBe('2026-09-04T12:00:00.000Z');
  });

  it('handles a year rollover correctly', () => {
    expect(computeExpiry('2026-12-20T00:00:00.000Z', 30)).toBe('2027-01-19T00:00:00.000Z');
  });
});
