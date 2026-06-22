/**
 * Unit tests for energyBalance.ts (Prompt 208b Task 4.4-T2).
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * The pure deriveBalanceState core is the key tested deliverable.
 * computeAndPersistEnergyBalance must be fail-open and NEVER throw; when the
 * Connected expenditure connector is off (the common case) expenditure is null
 * and the state degrades to insufficient_data unless a composition trend exists.
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the admin client (the only DB dependency).
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import {
  deriveBalanceState,
  computeAndPersistEnergyBalance,
} from '../energyBalance';
import { createAdminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// A table-aware admin-client mock.
//   - nutrition_logs: a select chain that resolves to { data, error }.
//   - body_tracker_weight: a select chain that resolves to { data, error }.
//   - energy_balance_signals: an insert.
// Pass `throwOnTable` to make a given table's `select` throw (read error path).
// ---------------------------------------------------------------------------
function makeAdminMock(opts: {
  nutritionRows?: Array<Record<string, unknown>> | null;
  nutritionError?: object | null;
  weightRows?: Array<Record<string, unknown>> | null;
  weightError?: object | null;
  insertMock?: ReturnType<typeof vi.fn>;
  throwOnTable?: 'nutrition_logs' | 'body_tracker_weight';
}) {
  const insertMock =
    opts.insertMock ?? vi.fn().mockResolvedValue({ data: null, error: null });

  const buildSelectChain = (rows: Array<Record<string, unknown>> | null, error: object | null) => {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows ?? null, error: error ?? null }),
    };
    // Some reads resolve at .order, some at .limit; make the chain itself
    // thenable so awaiting at any terminal yields the result.
    (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows ?? null, error: error ?? null });
    return chain;
  };

  return {
    insertMock,
    client: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'nutrition_logs') {
          if (opts.throwOnTable === 'nutrition_logs') {
            return {
              select: vi.fn().mockImplementation(() => {
                throw new Error('nutrition read failed');
              }),
            };
          }
          return buildSelectChain(opts.nutritionRows ?? null, opts.nutritionError ?? null);
        }
        if (table === 'body_tracker_weight') {
          if (opts.throwOnTable === 'body_tracker_weight') {
            return {
              select: vi.fn().mockImplementation(() => {
                throw new Error('weight read failed');
              }),
            };
          }
          return buildSelectChain(opts.weightRows ?? null, opts.weightError ?? null);
        }
        // energy_balance_signals
        return { insert: insertMock };
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// deriveBalanceState - PURE, DETERMINISTIC
// ===========================================================================

describe('deriveBalanceState', () => {
  it('returns deficit when intake is below expenditure by a meaningful margin', () => {
    expect(
      deriveBalanceState({ intakeEstimate: 1800, expenditureEstimate: 2200, compositionTrend: null }),
    ).toBe('deficit');
  });

  it('returns surplus when intake exceeds expenditure by a meaningful margin', () => {
    expect(
      deriveBalanceState({ intakeEstimate: 2600, expenditureEstimate: 2200, compositionTrend: null }),
    ).toBe('surplus');
  });

  it('returns maintenance when intake and expenditure are within the margin', () => {
    expect(
      deriveBalanceState({ intakeEstimate: 2200, expenditureEstimate: 2200, compositionTrend: null }),
    ).toBe('maintenance');
  });

  it('does not flip a measured deficit even when the trend says rising', () => {
    // Measured gap is the ground truth when both numbers are present.
    expect(
      deriveBalanceState({ intakeEstimate: 1800, expenditureEstimate: 2200, compositionTrend: 'rising' }),
    ).toBe('deficit');
  });

  it('infers deficit from a falling composition trend when expenditure is null', () => {
    expect(
      deriveBalanceState({ intakeEstimate: 2000, expenditureEstimate: null, compositionTrend: 'falling' }),
    ).toBe('deficit');
  });

  it('infers surplus from a rising composition trend when expenditure is null', () => {
    expect(
      deriveBalanceState({ intakeEstimate: 2000, expenditureEstimate: null, compositionTrend: 'rising' }),
    ).toBe('surplus');
  });

  it('infers maintenance from a flat composition trend when expenditure is null', () => {
    expect(
      deriveBalanceState({ intakeEstimate: 2000, expenditureEstimate: null, compositionTrend: 'flat' }),
    ).toBe('maintenance');
  });

  it('returns insufficient_data when expenditure and composition trend are both null', () => {
    expect(
      deriveBalanceState({ intakeEstimate: 2000, expenditureEstimate: null, compositionTrend: null }),
    ).toBe('insufficient_data');
  });

  it('returns insufficient_data when everything is null (never fabricates)', () => {
    expect(
      deriveBalanceState({ intakeEstimate: null, expenditureEstimate: null, compositionTrend: null }),
    ).toBe('insufficient_data');
  });

  it('is deterministic for the same input', () => {
    const inp = { intakeEstimate: 1800, expenditureEstimate: 2200, compositionTrend: null } as const;
    expect(deriveBalanceState(inp)).toBe(deriveBalanceState(inp));
  });
});

// ===========================================================================
// computeAndPersistEnergyBalance - best-effort reads, fail-open, persist
// ===========================================================================

describe('computeAndPersistEnergyBalance', () => {
  it('derives deficit from intake + a falling weight series with no expenditure, and persists it', async () => {
    const userId = 'user-deficit';
    // Two confirmed daily meals + a clearly falling weight series.
    const { client, insertMock } = makeAdminMock({
      nutritionRows: [
        { calories: 1800, logged_at: '2026-06-20T12:00:00Z' },
        { calories: 1800, logged_at: '2026-06-21T12:00:00Z' },
      ],
      weightRows: [
        { weight_lbs: 185, created_at: '2026-06-15T08:00:00Z' },
        { weight_lbs: 182, created_at: '2026-06-18T08:00:00Z' },
        { weight_lbs: 180, created_at: '2026-06-21T08:00:00Z' },
      ],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistEnergyBalance(userId);

    expect(result.expenditureEstimate).toBeNull();
    expect(result.compositionTrend).toBe('falling');
    expect(result.intakeEstimate).toBe(1800);
    expect(result.balanceState).toBe('deficit');

    // Persisted exactly one row to energy_balance_signals.
    expect(insertMock).toHaveBeenCalledOnce();
    const inserted = insertMock.mock.calls[0][0];
    expect(inserted).toMatchObject({
      user_id: userId,
      intake_estimate: 1800,
      expenditure_estimate: null,
      composition_trend: 'falling',
      balance_state: 'deficit',
      signal_window: 'recent',
    });
  });

  it('returns insufficient_data (and never fabricates expenditure) when there is no data', async () => {
    const userId = 'user-empty';
    const { client, insertMock } = makeAdminMock({
      nutritionRows: [],
      weightRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistEnergyBalance(userId);

    expect(result.intakeEstimate).toBeNull();
    expect(result.expenditureEstimate).toBeNull();
    expect(result.compositionTrend).toBeNull();
    expect(result.balanceState).toBe('insufficient_data');
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('is fail-open on a nutrition read error: that input degrades to null, still returns a valid object, no throw', async () => {
    const userId = 'user-nutrition-throws';
    const { client } = makeAdminMock({
      throwOnTable: 'nutrition_logs',
      weightRows: [
        { weight_lbs: 185, created_at: '2026-06-15T08:00:00Z' },
        { weight_lbs: 180, created_at: '2026-06-21T08:00:00Z' },
      ],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistEnergyBalance(userId);

    // Nutrition failed open to null; composition trend still drives the state.
    expect(result.intakeEstimate).toBeNull();
    expect(result.compositionTrend).toBe('falling');
    expect(result.balanceState).toBe('deficit');
  });

  it('is fail-open on a weight read error: composition trend degrades to null, no throw', async () => {
    const userId = 'user-weight-throws';
    const { client } = makeAdminMock({
      nutritionRows: [{ calories: 2000, logged_at: '2026-06-21T12:00:00Z' }],
      throwOnTable: 'body_tracker_weight',
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistEnergyBalance(userId);

    expect(result.compositionTrend).toBeNull();
    expect(result.expenditureEstimate).toBeNull();
    // intake present but no expenditure and no trend -> insufficient_data.
    expect(result.balanceState).toBe('insufficient_data');
  });

  it('still returns a valid object when the persist insert fails (fail-open persist)', async () => {
    const userId = 'user-insert-fails';
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const { client } = makeAdminMock({
      nutritionRows: [{ calories: 2000, logged_at: '2026-06-21T12:00:00Z' }],
      weightRows: [
        { weight_lbs: 180, created_at: '2026-06-15T08:00:00Z' },
        { weight_lbs: 183, created_at: '2026-06-21T08:00:00Z' },
      ],
      insertMock,
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistEnergyBalance(userId);

    expect(result.compositionTrend).toBe('rising');
    expect(result.balanceState).toBe('surplus');
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('never throws even when createAdminClient itself throws', async () => {
    const userId = 'user-no-client';
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    });

    const result = await computeAndPersistEnergyBalance(userId);

    expect(result.intakeEstimate).toBeNull();
    expect(result.expenditureEstimate).toBeNull();
    expect(result.compositionTrend).toBeNull();
    expect(result.balanceState).toBe('insufficient_data');
  });
});
