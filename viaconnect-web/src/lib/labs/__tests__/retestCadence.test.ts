/**
 * Unit tests for retestCadence.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208b Task 4.8-T2 (2026-06-22).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock modules that hit the DB.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import {
  RETEST_WINDOWS_WEEKS,
  retestWindowWeeks,
  retestWindowLabel,
  compareRetest,
  scheduleRetest,
  getDueRetests,
} from '../retestCadence';
import { createAdminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 3600 * 1000;
const EIGHT_WEEKS_MS = 8 * 7 * 24 * 3600 * 1000;
const NOW_MS = 1_700_000_000_000; // deterministic epoch

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// RETEST_WINDOWS_WEEKS
// ---------------------------------------------------------------------------

describe('RETEST_WINDOWS_WEEKS', () => {
  it('exports an object with all required biomarkers', () => {
    const required = [
      'vitamin_d',
      'ferritin',
      'homocysteine',
      'hscrp',
      'vitamin_b12',
      'ldl',
      'hba1c',
      'folate',
      'magnesium',
    ];
    for (const key of required) {
      expect(RETEST_WINDOWS_WEEKS).toHaveProperty(key);
    }
  });

  it('assigns 12-week windows to vitamin_d, ferritin, vitamin_b12, ldl, hba1c', () => {
    expect(RETEST_WINDOWS_WEEKS['vitamin_d']).toBe(12);
    expect(RETEST_WINDOWS_WEEKS['ferritin']).toBe(12);
    expect(RETEST_WINDOWS_WEEKS['vitamin_b12']).toBe(12);
    expect(RETEST_WINDOWS_WEEKS['ldl']).toBe(12);
    expect(RETEST_WINDOWS_WEEKS['hba1c']).toBe(12);
  });

  it('assigns 8-week windows to homocysteine, hscrp, folate, magnesium', () => {
    expect(RETEST_WINDOWS_WEEKS['homocysteine']).toBe(8);
    expect(RETEST_WINDOWS_WEEKS['hscrp']).toBe(8);
    expect(RETEST_WINDOWS_WEEKS['folate']).toBe(8);
    expect(RETEST_WINDOWS_WEEKS['magnesium']).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// retestWindowWeeks
// ---------------------------------------------------------------------------

describe('retestWindowWeeks', () => {
  it('returns 12 for vitamin_d (exact key)', () => {
    expect(retestWindowWeeks('vitamin_d')).toBe(12);
  });

  it('is case-insensitive: HsCRP -> 8', () => {
    expect(retestWindowWeeks('HsCRP')).toBe(8);
  });

  it('returns 12 for an unknown biomarker (default)', () => {
    expect(retestWindowWeeks('unknown_marker_xyz')).toBe(12);
  });

  it('returns 8 for homocysteine', () => {
    expect(retestWindowWeeks('homocysteine')).toBe(8);
  });

  it('is case-insensitive: VITAMIN_D -> 12', () => {
    expect(retestWindowWeeks('VITAMIN_D')).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// retestWindowLabel
// ---------------------------------------------------------------------------

describe('retestWindowLabel', () => {
  it('returns "12 weeks" for 12', () => {
    expect(retestWindowLabel(12)).toBe('12 weeks');
  });

  it('returns "8 weeks" for 8', () => {
    expect(retestWindowLabel(8)).toBe('8 weeks');
  });

  it('works for arbitrary values', () => {
    expect(retestWindowLabel(4)).toBe('4 weeks');
    expect(retestWindowLabel(24)).toBe('24 weeks');
  });
});

// ---------------------------------------------------------------------------
// compareRetest
// ---------------------------------------------------------------------------

describe('compareRetest', () => {
  // riskDirection 'high' = high is bad (e.g. homocysteine)

  it('homocysteine (high): baseline 18, current 12 -> improving (delta -6)', () => {
    const result = compareRetest(18, 12, 'high');
    expect(result.delta).toBe(-6);
    expect(result.direction).toBe('improving');
  });

  it('homocysteine (high): baseline 18, current 22 -> worsening (delta 4)', () => {
    const result = compareRetest(18, 22, 'high');
    expect(result.delta).toBe(4);
    expect(result.direction).toBe('worsening');
  });

  // riskDirection 'low' = low is bad (e.g. vitamin_d deficiency)

  it('vitamin_d (low): baseline 20, current 35 -> improving (delta 15)', () => {
    const result = compareRetest(20, 35, 'low');
    expect(result.delta).toBe(15);
    expect(result.direction).toBe('improving');
  });

  it('vitamin_d (low): baseline 35, current 20 -> worsening (delta -15)', () => {
    const result = compareRetest(35, 20, 'low');
    expect(result.delta).toBe(-15);
    expect(result.direction).toBe('worsening');
  });

  it('unchanged when delta is 0 (default epsilon = 0)', () => {
    const result = compareRetest(30, 30, 'low');
    expect(result.delta).toBe(0);
    expect(result.direction).toBe('unchanged');
  });

  it('unchanged when |delta| <= epsilon (explicit epsilon)', () => {
    // baseline 30, current 30.5, epsilon 1 -> |delta| = 0.5 <= 1 -> unchanged
    const result = compareRetest(30, 30.5, 'high', 1);
    expect(result.delta).toBeCloseTo(0.5);
    expect(result.direction).toBe('unchanged');
  });

  it('worsening when |delta| > epsilon (high risk)', () => {
    // baseline 30, current 32, epsilon 1 -> delta = 2 > 1, high = worsening
    const result = compareRetest(30, 32, 'high', 1);
    expect(result.delta).toBe(2);
    expect(result.direction).toBe('worsening');
  });

  it('worsening when |delta| > epsilon (low risk, delta negative)', () => {
    // baseline 30, current 27, epsilon 1 -> delta = -3, |delta| = 3 > 1, low = worsening
    const result = compareRetest(30, 27, 'low', 1);
    expect(result.delta).toBe(-3);
    expect(result.direction).toBe('worsening');
  });
});

// ---------------------------------------------------------------------------
// scheduleRetest
// ---------------------------------------------------------------------------

describe('scheduleRetest', () => {
  function makeInsertMock(resolvedValue: object) {
    const insertFn = vi.fn().mockResolvedValue(resolvedValue);
    return {
      client: {
        from: vi.fn().mockReturnValue({ insert: insertFn }),
      },
      insertFn,
    };
  }

  it('persists a row with recommended_retest_at = nowMs + 12 weeks for vitamin_d, returns true', async () => {
    const { client, insertFn } = makeInsertMock({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await scheduleRetest('user-abc', {
      biomarker: 'vitamin_d',
      interventionRef: 'protocol-123',
      baselineValue: 22,
      nowMs: NOW_MS,
    });

    expect(result).toBe(true);
    expect(insertFn).toHaveBeenCalledOnce();

    const row = insertFn.mock.calls[0][0];
    expect(row.user_id).toBe('user-abc');
    expect(row.biomarker).toBe('vitamin_d');
    expect(row.intervention_ref).toBe('protocol-123');
    expect(row.recommended_retest_window).toBe('12 weeks');
    expect(row.status).toBe('scheduled');
    expect(row.baseline_value).toBe(22);

    // Verify the retest_at is exactly nowMs + 12*7*24*3600*1000
    const expectedAt = new Date(NOW_MS + TWELVE_WEEKS_MS).toISOString();
    expect(row.recommended_retest_at).toBe(expectedAt);
  });

  it('uses 8-week window for homocysteine', async () => {
    const { client, insertFn } = makeInsertMock({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    await scheduleRetest('user-xyz', {
      biomarker: 'homocysteine',
      nowMs: NOW_MS,
    });

    const row = insertFn.mock.calls[0][0];
    expect(row.recommended_retest_window).toBe('8 weeks');

    const expectedAt = new Date(NOW_MS + EIGHT_WEEKS_MS).toISOString();
    expect(row.recommended_retest_at).toBe(expectedAt);
  });

  it('returns false (fail-open) when DB insert returns an error', async () => {
    const { client } = makeInsertMock({ data: null, error: { message: 'insert failed' } });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await scheduleRetest('user-err', {
      biomarker: 'vitamin_d',
      nowMs: NOW_MS,
    });

    expect(result).toBe(false);
  });

  it('returns false (fail-open) when insert rejects/throws', async () => {
    const insertFn = vi.fn().mockRejectedValue(new Error('network error'));
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertFn }),
    });

    const result = await scheduleRetest('user-throw', {
      biomarker: 'vitamin_d',
      nowMs: NOW_MS,
    });

    expect(result).toBe(false);
  });

  it('returns false (fail-open) when createAdminClient throws', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('env not configured');
    });

    const result = await scheduleRetest('user-no-client', {
      biomarker: 'vitamin_d',
      nowMs: NOW_MS,
    });

    expect(result).toBe(false);
  });

  it('handles null baselineValue gracefully', async () => {
    const { client, insertFn } = makeInsertMock({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await scheduleRetest('user-no-baseline', {
      biomarker: 'folate',
      baselineValue: null,
      nowMs: NOW_MS,
    });

    expect(result).toBe(true);
    const row = insertFn.mock.calls[0][0];
    expect(row.baseline_value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDueRetests
// ---------------------------------------------------------------------------

describe('getDueRetests', () => {
  function makeSelectMock(rows: object[]) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    return {
      from: vi.fn().mockReturnValue(chain),
    };
  }

  it('returns scheduled rows whose recommended_retest_at <= nowMs', async () => {
    const pastAt = new Date(NOW_MS - 1000).toISOString();
    const rows = [
      { biomarker: 'vitamin_d', recommended_retest_at: pastAt, baseline_value: 22 },
      { biomarker: 'homocysteine', recommended_retest_at: pastAt, baseline_value: 18 },
    ];

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeSelectMock(rows));

    const results = await getDueRetests('user-abc', NOW_MS);

    expect(results).toHaveLength(2);
    expect(results[0].biomarker).toBe('vitamin_d');
    expect(results[1].biomarker).toBe('homocysteine');
  });

  it('returns [] when there are no due rows', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeSelectMock([]));

    const results = await getDueRetests('user-empty', NOW_MS);

    expect(results).toHaveLength(0);
  });

  it('returns [] (fail-open) when DB query returns an error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: null, error: { message: 'query failed' } }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const results = await getDueRetests('user-err', NOW_MS);

    expect(results).toHaveLength(0);
  });

  it('returns [] (fail-open) when query rejects/throws', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lte: vi.fn().mockRejectedValue(new Error('network error')),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const results = await getDueRetests('user-throw', NOW_MS);

    expect(results).toHaveLength(0);
  });

  it('returns [] (fail-open) when createAdminClient throws', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('env not configured');
    });

    const results = await getDueRetests('user-no-client', NOW_MS);

    expect(results).toHaveLength(0);
  });
});
