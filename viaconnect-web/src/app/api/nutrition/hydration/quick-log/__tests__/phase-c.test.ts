/**
 * Prompt 172e Phase C: hydration quick log route Phase C contract tests.
 *
 * Pins three new behaviors layered on top of the existing 170o quick log:
 *   1. beverage_slug optional in the request body; legacy callers still work
 *   2. when beverage_slug is present and the row carries caffeine, the
 *      route persists meal_items.caffeine_mg from the catalog row scaled
 *      to the logged volume
 *   3. when beverage_slug points to an alcoholic row and the user is above
 *      the daily threshold, hydration_ml is reduced via the diuretic ramp
 *
 * Phase C does not touch the 171b caffeine engine, the photo analyze path,
 * or the BOS scoring. The 170o dedup short circuit precedes the new code
 * paths, so a dedup hit never double attributes caffeine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  supabaseAuth: vi.fn(),
  adminFrom: vi.fn(),
  recomputeNutritionDimension: vi.fn(),
  checkHydrationDeduplication: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/nutrition/bos-bridge', () => ({
  recomputeNutritionDimension: mocks.recomputeNutritionDimension,
}));

vi.mock('@/lib/nutrition/hydration/deduplication-checker', async (importOriginal) => {
  const original: Record<string, unknown> = await importOriginal();
  return {
    ...original,
    checkHydrationDeduplication: mocks.checkHydrationDeduplication,
  };
});

let POST: typeof import('@/app/api/nutrition/hydration/quick-log/route').POST;

beforeEach(async () => {
  mocks.supabaseAuth.mockReset();
  mocks.adminFrom.mockReset();
  mocks.recomputeNutritionDimension.mockReset();
  mocks.checkHydrationDeduplication.mockReset();
  process.env.HYDRATION_TRACKING_ENABLED = 'true';
  delete process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS;
  const mod = await import('@/app/api/nutrition/hydration/quick-log/route');
  POST = mod.POST;
});

function buildRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/nutrition/hydration/quick-log', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Wires the admin client mock to return profile counting mode + catalog
 * row + insert results. Returns the captured meal_items insert payload
 * so assertions can inspect what landed on the row.
 */
function wireAdminMocks(args: {
  profileCountingMode?: 'conservative' | 'adjusted';
  catalogRow?: Record<string, unknown> | null;
  alcoholicCountToday?: number;
  mealInsertReturn?: { meal_id: string } | null;
  mealInsertError?: unknown;
}) {
  const profileMaybeSingle = vi.fn().mockResolvedValue({
    data: { hydration_counting_mode: args.profileCountingMode ?? 'adjusted' },
    error: null,
  });
  const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle });
  const profileSelect = vi.fn().mockReturnValue({ eq: profileEq });

  const catalogMaybeSingle = vi.fn().mockResolvedValue({
    data: args.catalogRow ?? null,
    error: null,
  });
  const catalogEq2 = vi.fn().mockReturnValue({ maybeSingle: catalogMaybeSingle });
  const catalogEq1 = vi.fn().mockReturnValue({ eq: catalogEq2 });
  const catalogSelect = vi.fn().mockReturnValue({ eq: catalogEq1 });

  const alcoholInResult = vi.fn().mockResolvedValue({
    count: args.alcoholicCountToday ?? 0,
    error: null,
  });
  const alcoholLte = vi.fn().mockReturnValue({ in: alcoholInResult });
  const alcoholGte = vi.fn().mockReturnValue({ lte: alcoholLte });
  const alcoholEq = vi.fn().mockReturnValue({ gte: alcoholGte });
  const alcoholSelect = vi.fn().mockReturnValue({ eq: alcoholEq });

  const mealSingle = vi.fn().mockResolvedValue({
    data: args.mealInsertReturn ?? { meal_id: 'meal-1' },
    error: args.mealInsertError ?? null,
  });
  const mealSelect = vi.fn().mockReturnValue({ single: mealSingle });
  const mealInsert = vi.fn().mockReturnValue({ select: mealSelect });

  const itemInsertPayloadHolder: { last: Record<string, unknown> | null } = { last: null };
  const itemInsert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    itemInsertPayloadHolder.last = payload;
    return Promise.resolve({ error: null });
  });

  const telemetryInsert = vi.fn().mockResolvedValue({ error: null });

  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return { select: profileSelect };
    if (table === 'beverage_catalog') return { select: catalogSelect };
    if (table === 'meal_items') {
      // The route uses meal_items twice: once via select for the alcohol
      // daily count and once via insert for the new row.
      return {
        select: alcoholSelect,
        insert: itemInsert,
      };
    }
    if (table === 'meals') return { insert: mealInsert };
    if (table === 'hydration_log_sessions') return { insert: telemetryInsert };
    throw new Error(`Unexpected table access: ${table}`);
  });

  return { itemInsertPayloadHolder, mealInsert };
}

describe('Phase C: backward compatibility with legacy 170o quick log payload', () => {
  it('accepts a request with no beverage_slug and inserts without caffeine_mg', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: null,
    });

    const res = await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'pure_water',
      log_surface: 'dashboard_widget',
    }));

    expect(res.status).toBe(200);
    expect(itemInsertPayloadHolder.last).not.toBeNull();
    expect(itemInsertPayloadHolder.last?.beverage_catalog_slug).toBeUndefined();
    expect(itemInsertPayloadHolder.last?.caffeine_mg).toBeUndefined();
    expect(itemInsertPayloadHolder.last?.food_name).toBe('Water');
  });
});

describe('Phase C: caffeine attribution from beverage_slug', () => {
  it('persists effective caffeine_mg and beverage_catalog_slug for drip coffee 240 ml', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'coffee_drip',
        display_name: 'Drip Coffee',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 95,
        is_alcoholic: false,
      },
    });

    const res = await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    expect(res.status).toBe(200);
    expect(itemInsertPayloadHolder.last?.beverage_catalog_slug).toBe('coffee_drip');
    expect(itemInsertPayloadHolder.last?.caffeine_mg).toBe(95);
    // catalog display_name wins over the generic legacy kind based name
    expect(itemInsertPayloadHolder.last?.food_name).toBe('Drip Coffee');
  });

  it('scales caffeine by served volume vs default volume (480 ml -> 190 mg)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'coffee_drip',
        display_name: 'Drip Coffee',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 95,
        is_alcoholic: false,
      },
    });

    await POST(buildRequest({
      volume_ml: 480,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    expect(itemInsertPayloadHolder.last?.caffeine_mg).toBe(190);
  });

  it('omits caffeine_mg key when catalog row carries 0 caffeine (herbal tea)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'tea_herbal',
        display_name: 'Herbal Tea',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 0,
        is_alcoholic: false,
      },
    });

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'tea_herbal',
    }));

    expect(itemInsertPayloadHolder.last?.beverage_catalog_slug).toBe('tea_herbal');
    expect(itemInsertPayloadHolder.last?.caffeine_mg).toBeUndefined();
  });

  it('short circuits before insert on a dedup hit (no double attribution)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: true,
      reference_meal_id: 'existing-meal',
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      catalogRow: {
        slug: 'coffee_drip',
        display_name: 'Drip Coffee',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 95,
        is_alcoholic: false,
      },
    });

    const res = await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    const body = await res.json();
    expect(body.deduplicated).toBe(true);
    expect(body.meal_id).toBe('existing-meal');
    expect(itemInsertPayloadHolder.last).toBeNull();
  });
});

describe('Phase C: alcohol diuretic reduction at write time', () => {
  it('does not reduce hydration when daily drink count is at or below the threshold', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'alcohol_beer',
        display_name: 'Beer',
        default_volume_ml: 355,
        caffeine_mg_per_serving: 0,
        is_alcoholic: true,
      },
      alcoholicCountToday: 2, // below threshold 3
    });

    const res = await POST(buildRequest({
      volume_ml: 355,
      beverage_kind: 'alcohol_low',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'alcohol_beer',
    }));

    expect(res.status).toBe(200);
    // 1.00 coefficient applied; full 355 ml retained
    expect(itemInsertPayloadHolder.last?.hydration_ml).toBe(355);
  });

  it('reduces hydration via the linear ramp above threshold (5 drinks -> ~0.8667 coefficient)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'alcohol_beer',
        display_name: 'Beer',
        default_volume_ml: 355,
        caffeine_mg_per_serving: 0,
        is_alcoholic: true,
      },
      alcoholicCountToday: 5, // 2 past threshold of 3 -> 2/3 of the 0.20 reduction
    });

    await POST(buildRequest({
      volume_ml: 355,
      beverage_kind: 'alcohol_low',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'alcohol_beer',
    }));

    // Expect ~307.67 ml (355 * 0.8667)
    const hydration = itemInsertPayloadHolder.last?.hydration_ml as number;
    expect(hydration).toBeGreaterThan(307);
    expect(hydration).toBeLessThan(308);
  });

  it('reaches the 0.80 floor at 6 drinks and stays clamped beyond', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'alcohol_beer',
        display_name: 'Beer',
        default_volume_ml: 355,
        caffeine_mg_per_serving: 0,
        is_alcoholic: true,
      },
      alcoholicCountToday: 6,
    });

    await POST(buildRequest({
      volume_ml: 355,
      beverage_kind: 'alcohol_low',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'alcohol_beer',
    }));

    // 355 * 0.80 = 284
    expect(itemInsertPayloadHolder.last?.hydration_ml).toBe(284);
  });

  it('does not apply the reduction to non alcoholic catalog rows even at high alcoholic count', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'water_still',
        display_name: 'Still Water',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 0,
        is_alcoholic: false,
      },
      alcoholicCountToday: 100,
    });

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'pure_water',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'water_still',
    }));

    expect(itemInsertPayloadHolder.last?.hydration_ml).toBe(240);
  });
});
