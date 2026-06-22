/**
 * Unit tests for hydrationReconciliation.ts (Prompt 208b Task 4.7-T2).
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * activityAdjustedTarget and electrolyteContext are PURE and DETERMINISTIC.
 * computeAndPersistHydrationReconciliation must be fail-open (never throws).
 * When a source is absent the relevant field degrades to base/unknown - nothing
 * is fabricated. No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the admin client (the only DB dependency).
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import {
  activityAdjustedTarget,
  electrolyteContext,
  computeAndPersistHydrationReconciliation,
} from '../hydrationReconciliation';
import { createAdminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// Admin mock factory - mirrors the energyBalance test pattern.
// Tables needed:
//   profiles             - body_weight_kg, hydration_target_ml_per_day_custom
//   body_tracker_weight  - body_water_pct
//   lab_biomarkers       - electrolyte rows (sodium/potassium/magnesium)
//   hydration_reconciliation - insert (persist)
// Pass throwOnTable to simulate read errors.
// ---------------------------------------------------------------------------
function makeAdminMock(opts: {
  profileRow?: Record<string, unknown> | null;
  profileError?: object | null;
  weightRow?: Record<string, unknown> | null;
  weightError?: object | null;
  labRows?: Array<Record<string, unknown>> | null;
  labError?: object | null;
  insertMock?: ReturnType<typeof vi.fn>;
  throwOnTable?: 'profiles' | 'body_tracker_weight' | 'lab_biomarkers';
}) {
  const insertMock =
    opts.insertMock ?? vi.fn().mockResolvedValue({ data: null, error: null });

  const buildSingleChain = (
    row: Record<string, unknown> | null,
    error: object | null,
  ) => {
    const result = { data: row ?? null, error: error ?? null };
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
      limit: vi.fn().mockResolvedValue(result),
    };
    (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      resolve(result);
    return chain;
  };

  const buildListChain = (
    rows: Array<Record<string, unknown>> | null,
    error: object | null,
  ) => {
    const result = { data: rows ?? null, error: error ?? null };
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(result),
      maybeSingle: vi.fn().mockResolvedValue(result),
      not: vi.fn().mockReturnThis(),
    };
    (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      resolve(result);
    return chain;
  };

  return {
    insertMock,
    client: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          if (opts.throwOnTable === 'profiles') {
            return {
              select: vi.fn().mockImplementation(() => {
                throw new Error('profiles read failed');
              }),
            };
          }
          return buildSingleChain(opts.profileRow ?? null, opts.profileError ?? null);
        }
        if (table === 'body_tracker_weight') {
          if (opts.throwOnTable === 'body_tracker_weight') {
            return {
              select: vi.fn().mockImplementation(() => {
                throw new Error('body_tracker_weight read failed');
              }),
            };
          }
          return buildListChain(opts.weightRow ? [opts.weightRow] : (opts.weightRow === null ? null : []), opts.weightError ?? null);
        }
        if (table === 'lab_biomarkers') {
          if (opts.throwOnTable === 'lab_biomarkers') {
            return {
              select: vi.fn().mockImplementation(() => {
                throw new Error('lab_biomarkers read failed');
              }),
            };
          }
          return buildListChain(opts.labRows ?? null, opts.labError ?? null);
        }
        // hydration_reconciliation insert
        return { insert: insertMock };
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// activityAdjustedTarget - PURE, DETERMINISTIC
// ===========================================================================

describe('activityAdjustedTarget', () => {
  it('returns base unchanged when activity expenditure is null (DEGRADE, no adjustment)', () => {
    expect(activityAdjustedTarget(2000, null)).toBe(2000);
  });

  it('returns base unchanged when activity expenditure is 0', () => {
    expect(activityAdjustedTarget(2000, 0)).toBe(2000);
  });

  it('returns base unchanged when activity is at or below the rest threshold', () => {
    // threshold is ~200 kcal; below it means no sweat allowance
    expect(activityAdjustedTarget(2000, 150)).toBe(2000);
  });

  it('adds proportional sweat allowance at 600 kcal activity (result ~2500)', () => {
    // +500 ml per ~500 kcal above threshold; 600 kcal -> ~400 kcal above 200 -> ~400 ml
    // Documented step: at 600 kcal the brief expects ~2500.
    // The spec example: (2000, 600) -> 2500
    // This means 600 kcal of activity adds 500 ml. Implementation must match.
    expect(activityAdjustedTarget(2000, 600)).toBe(2500);
  });

  it('caps the sweat allowance at +1500 ml for very high activity', () => {
    // 5000 kcal activity should still be capped at base + 1500
    expect(activityAdjustedTarget(2000, 5000)).toBe(3500);
  });

  it('is deterministic for the same input', () => {
    expect(activityAdjustedTarget(2000, 600)).toBe(activityAdjustedTarget(2000, 600));
  });

  it('handles a base of 0 without producing negative results', () => {
    expect(activityAdjustedTarget(0, null)).toBe(0);
  });
});

// ===========================================================================
// electrolyteContext - PURE, DETERMINISTIC
// ===========================================================================

describe('electrolyteContext', () => {
  it("returns 'unknown' when no electrolyte labs are present (DEGRADE)", () => {
    expect(electrolyteContext([])).toBe('unknown');
  });

  it("returns 'unknown' when only unrelated labs are present (none of sodium/potassium/magnesium)", () => {
    expect(
      electrolyteContext([
        { biomarker: 'glucose', value: 90, low: 70, high: 99 },
      ]),
    ).toBe('unknown');
  });

  it("returns 'low_electrolytes' when sodium is below its reference low", () => {
    expect(
      electrolyteContext([
        { biomarker: 'sodium', value: 130, low: 135, high: 145 },
      ]),
    ).toBe('low_electrolytes');
  });

  it("returns 'low_electrolytes' when potassium is below its reference low", () => {
    expect(
      electrolyteContext([
        { biomarker: 'potassium', value: 3.0, low: 3.5, high: 5.0 },
      ]),
    ).toBe('low_electrolytes');
  });

  it("returns 'low_electrolytes' when magnesium is below its reference low", () => {
    expect(
      electrolyteContext([
        { biomarker: 'magnesium', value: 1.5, low: 1.7, high: 2.4 },
      ]),
    ).toBe('low_electrolytes');
  });

  it("returns 'elevated_electrolytes' when sodium is above its reference high", () => {
    expect(
      electrolyteContext([
        { biomarker: 'sodium', value: 150, low: 135, high: 145 },
      ]),
    ).toBe('elevated_electrolytes');
  });

  it("returns 'balanced' when all present electrolytes are within range", () => {
    expect(
      electrolyteContext([
        { biomarker: 'sodium', value: 140, low: 135, high: 145 },
        { biomarker: 'potassium', value: 4.0, low: 3.5, high: 5.0 },
        { biomarker: 'magnesium', value: 2.0, low: 1.7, high: 2.4 },
      ]),
    ).toBe('balanced');
  });

  it("prefers 'low_electrolytes' when one is low and others are balanced", () => {
    expect(
      electrolyteContext([
        { biomarker: 'sodium', value: 140, low: 135, high: 145 },
        { biomarker: 'potassium', value: 3.0, low: 3.5, high: 5.0 },
      ]),
    ).toBe('low_electrolytes');
  });

  it("returns 'balanced' when electrolyte has null bounds (no range to violate)", () => {
    expect(
      electrolyteContext([
        { biomarker: 'sodium', value: 140, low: null, high: null },
      ]),
    ).toBe('balanced');
  });

  it('is case-insensitive for biomarker name matching', () => {
    expect(
      electrolyteContext([
        { biomarker: 'Sodium', value: 130, low: 135, high: 145 },
      ]),
    ).toBe('low_electrolytes');
  });

  it('is deterministic for the same input', () => {
    const labs = [{ biomarker: 'sodium', value: 140, low: 135, high: 145 }];
    expect(electrolyteContext(labs)).toBe(electrolyteContext(labs));
  });
});

// ===========================================================================
// computeAndPersistHydrationReconciliation - best-effort, fail-open
// ===========================================================================

describe('computeAndPersistHydrationReconciliation', () => {
  it('when profile has weight and no activity, adjusted target equals base target, and persists', async () => {
    const userId = 'user-base-only';
    const { client, insertMock } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: null },
      weightRow: { body_water_pct: 55 },
      labRows: [
        { name: 'Sodium', value: 140, reference_low: 135, reference_high: 145 },
      ],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    // 70 kg * 33 = 2310 ml, no activity -> adjusted == base
    expect(result.baseTargetMl).toBe(2310);
    expect(result.activityAdjustedTargetMl).toBe(2310);
    expect(result.electrolyteContext).toBe('balanced');
    expect(result.bodyWaterContext).toBe('normal');
    expect(insertMock).toHaveBeenCalledOnce();
    const persisted = insertMock.mock.calls[0][0];
    expect(persisted).toMatchObject({
      user_id: userId,
      base_target_ml: 2310,
      activity_adjusted_target_ml: 2310,
      electrolyte_context: 'balanced',
      body_water_context: 'normal',
    });
  });

  it('when profile is absent, uses fallback base target (2000 ml) and degrades contexts to unknown', async () => {
    const userId = 'user-no-profile';
    const { client, insertMock } = makeAdminMock({
      profileRow: null,
      weightRow: null,
      labRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.baseTargetMl).toBe(2000);
    expect(result.activityAdjustedTargetMl).toBe(2000);
    expect(result.electrolyteContext).toBe('unknown');
    expect(result.bodyWaterContext).toBe('unknown');
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('body water low (<40%) produces bodyWaterContext "low"', async () => {
    const userId = 'user-low-water';
    const { client } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: null },
      weightRow: { body_water_pct: 35 },
      labRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.bodyWaterContext).toBe('low');
  });

  it('body water high (>=65%) produces bodyWaterContext "high"', async () => {
    const userId = 'user-high-water';
    const { client } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: null },
      weightRow: { body_water_pct: 68 },
      labRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.bodyWaterContext).toBe('high');
  });

  it('absent body_water_pct degrades bodyWaterContext to "unknown"', async () => {
    const userId = 'user-no-water';
    const { client } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: null },
      weightRow: { body_water_pct: null },
      labRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.bodyWaterContext).toBe('unknown');
  });

  it('is fail-open on a profile read error: base target falls back to 2000, no throw', async () => {
    const userId = 'user-profile-throws';
    const { client } = makeAdminMock({
      throwOnTable: 'profiles',
      weightRow: { body_water_pct: 55 },
      labRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.baseTargetMl).toBe(2000);
    expect(result.activityAdjustedTargetMl).toBe(2000);
  });

  it('is fail-open on a lab read error: electrolyteContext degrades to "unknown", no throw', async () => {
    const userId = 'user-lab-throws';
    const { client } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: null },
      weightRow: { body_water_pct: 55 },
      throwOnTable: 'lab_biomarkers',
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.electrolyteContext).toBe('unknown');
    // Should still return a valid result without throwing
    expect(result.baseTargetMl).toBeGreaterThan(0);
  });

  it('is fail-open on a body_tracker_weight read error: bodyWaterContext degrades to "unknown", no throw', async () => {
    const userId = 'user-weight-throws';
    const { client } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: null },
      throwOnTable: 'body_tracker_weight',
      labRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.bodyWaterContext).toBe('unknown');
    expect(result.baseTargetMl).toBeGreaterThan(0);
  });

  it('persist failure does not stop the return (fail-open persist)', async () => {
    const userId = 'user-insert-fails';
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const { client } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: null },
      weightRow: { body_water_pct: 55 },
      labRows: [
        { name: 'Sodium', value: 140, reference_low: 135, reference_high: 145 },
      ],
      insertMock,
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.baseTargetMl).toBe(2310);
    expect(result.electrolyteContext).toBe('balanced');
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('never throws even when createAdminClient itself throws', async () => {
    const userId = 'user-no-client';
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    });

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.baseTargetMl).toBe(2000);
    expect(result.activityAdjustedTargetMl).toBe(2000);
    expect(result.electrolyteContext).toBe('unknown');
    expect(result.bodyWaterContext).toBe('unknown');
  });

  it('uses custom target when set in profile', async () => {
    const userId = 'user-custom-target';
    const { client } = makeAdminMock({
      profileRow: { body_weight_kg: 70, hydration_target_ml_per_day_custom: 2500 },
      weightRow: null,
      labRows: [],
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await computeAndPersistHydrationReconciliation(userId);

    expect(result.baseTargetMl).toBe(2500);
    expect(result.activityAdjustedTargetMl).toBe(2500);
  });
});
