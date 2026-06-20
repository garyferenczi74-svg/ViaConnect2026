/**
 * Prompt 207a Task 3: custom-beverage quick-log route contract tests.
 *
 * Pins four behaviors added in Task 3:
 *   1. when user_beverage_id is present the route reads user_beverages for
 *      hydration_source_kind + hydration_coefficient + display_name
 *   2. the meal_items row carries hydration_ml = round(volume_ml *
 *      coefficient * 100) / 100 and food_name = display_name from the row
 *   3. a hydration_log_sessions row is written UNCONDITIONALLY (no 20pct
 *      gate) with user_beverage_id set and beverage_catalog_slug null
 *   4. if the user_beverages lookup fails the route falls back to the
 *      non-custom path (fail-open) without blocking the log
 *
 * Math.random is forced high (>= 0.2) to prove the custom path bypasses
 * the sampling gate. The mock setup mirrors phase-f.test.ts exactly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  supabaseAuth: vi.fn(),
  adminFrom: vi.fn(),
  recomputeNutritionDimension: vi.fn(),
  checkHydrationDeduplication: vi.fn(),
  creditEarning: vi.fn(),
  countDistinctCatalogCategoriesToday: vi.fn(),
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

vi.mock('@/lib/helix/earning-engine', () => ({
  creditEarning: mocks.creditEarning,
}));

vi.mock('@/lib/nutrition/hydration/phase-f-helix', async (importOriginal) => {
  const original: Record<string, unknown> = await importOriginal();
  return {
    ...original,
    countDistinctCatalogCategoriesToday: mocks.countDistinctCatalogCategoriesToday,
  };
});

let POST: typeof import('@/app/api/nutrition/hydration/quick-log/route').POST;

beforeEach(async () => {
  mocks.supabaseAuth.mockReset();
  mocks.adminFrom.mockReset();
  mocks.recomputeNutritionDimension.mockReset();
  mocks.checkHydrationDeduplication.mockReset();
  mocks.creditEarning.mockReset();
  mocks.countDistinctCatalogCategoriesToday.mockReset();
  mocks.creditEarning.mockResolvedValue({ success: true, pointsEarned: 1 });
  mocks.countDistinctCatalogCategoriesToday.mockResolvedValue(1);
  process.env.HYDRATION_TRACKING_ENABLED = 'true';
  delete process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS;
  const mod = await import('@/app/api/nutrition/hydration/quick-log/route');
  POST = mod.POST;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/nutrition/hydration/quick-log', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Wires admin mocks for the custom-beverage path. Includes a user_beverages
 * table handler that returns the provided ubRow. Math.random is forced to
 * 0.99 (above 0.2) to prove the unconditional telemetry insert fires even
 * when the sampling gate would ordinarily block it.
 */
function wireAdminMocks(args: {
  profileCountingMode?: 'conservative' | 'adjusted';
  ubRow?: Record<string, unknown> | null;
  ubError?: unknown;
  catalogRow?: Record<string, unknown> | null;
  alcoholicCountToday?: number;
  mealInsertReturn?: { meal_id: string } | null;
  forceRandomHigh?: boolean;
}) {
  const profileMaybeSingle = vi.fn().mockResolvedValue({
    data: { hydration_counting_mode: args.profileCountingMode ?? 'adjusted' },
    error: null,
  });
  const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle });
  const profileSelect = vi.fn().mockReturnValue({ eq: profileEq });

  // user_beverages: select -> eq('id') -> maybeSingle
  const ubMaybeSingle = vi.fn().mockResolvedValue({
    data: args.ubError ? null : (args.ubRow ?? null),
    error: args.ubError ?? null,
  });
  const ubEq = vi.fn().mockReturnValue({ maybeSingle: ubMaybeSingle });
  const ubSelect = vi.fn().mockReturnValue({ eq: ubEq });

  // beverage_catalog: select -> eq(slug) -> eq(is_active) -> maybeSingle
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
    data: args.mealInsertReturn ?? { meal_id: 'meal-custom-1' },
    error: null,
  });
  const mealSelect = vi.fn().mockReturnValue({ single: mealSingle });
  const mealInsert = vi.fn().mockReturnValue({ select: mealSelect });

  const itemInsertPayloadHolder: { last: Record<string, unknown> | null } = { last: null };
  const itemInsert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    itemInsertPayloadHolder.last = payload;
    return Promise.resolve({ error: null });
  });

  const telemetryPayloadHolder: { last: Record<string, unknown> | null } = { last: null };
  const telemetryInsert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    telemetryPayloadHolder.last = payload;
    return Promise.resolve({ error: null });
  });

  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return { select: profileSelect };
    if (table === 'user_beverages') return { select: ubSelect };
    if (table === 'beverage_catalog') return { select: catalogSelect };
    if (table === 'meal_items') {
      return {
        select: alcoholSelect,
        insert: itemInsert,
      };
    }
    if (table === 'meals') return { insert: mealInsert };
    if (table === 'hydration_log_sessions') return { insert: telemetryInsert };
    throw new Error(`Unexpected table access: ${table}`);
  });

  // Force Math.random high to prove custom-path telemetry is unconditional
  if (args.forceRandomHigh !== false) {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  }

  return { itemInsertPayloadHolder, telemetryPayloadHolder, telemetryInsert, ubMaybeSingle };
}

describe('207a Task 3: custom beverage coefficient applied to hydration_ml', () => {
  it('computes hydration_ml from user_beverage coefficient (juice_smoothie 1.2 * 300 ml = 360)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-custom-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      ubRow: {
        hydration_source_kind: 'juice_smoothie',
        hydration_coefficient: 1.2,
        display_name: 'Green Smoothie',
      },
    });

    const res = await POST(buildRequest({
      volume_ml: 300,
      beverage_kind: 'pure_water',
      log_surface: 'hydration_detail_view',
      user_beverage_id: 'fc3c2ef0-4911-4840-b685-dc6be09eeee4',
    }));

    expect(res.status).toBe(200);
    expect(itemInsertPayloadHolder.last).not.toBeNull();
    // 300 * 1.2 = 360; Math.round(360 * 100) / 100 = 360
    expect(itemInsertPayloadHolder.last?.hydration_ml).toBe(360);
    expect(itemInsertPayloadHolder.last?.food_name).toBe('Green Smoothie');
    expect(itemInsertPayloadHolder.last?.hydration_source_kind).toBe('juice_smoothie');
  });

  it('applies fractional coefficient correctly (dairy 1.3 * 250 ml = 325)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-custom-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      ubRow: {
        hydration_source_kind: 'dairy',
        hydration_coefficient: 1.3,
        display_name: 'Homemade Kefir',
      },
    });

    await POST(buildRequest({
      volume_ml: 250,
      beverage_kind: 'pure_water',
      log_surface: 'floating_fab',
      user_beverage_id: '5ee7f6d0-d438-43a7-858a-3b2b39aec545',
    }));

    // 250 * 1.3 = 325
    expect(itemInsertPayloadHolder.last?.hydration_ml).toBe(325);
    expect(itemInsertPayloadHolder.last?.food_name).toBe('Homemade Kefir');
  });

  it('returns hydration_ml_logged in the response body', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-custom-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    wireAdminMocks({
      ubRow: {
        hydration_source_kind: 'pure_water',
        hydration_coefficient: 1.0,
        display_name: 'Lemon Water',
      },
    });

    const res = await POST(buildRequest({
      volume_ml: 400,
      beverage_kind: 'pure_water',
      log_surface: 'dashboard_widget',
      user_beverage_id: 'dc766431-e9be-4cf8-b35c-8bd7385d13e2',
    }));

    const body = await res.json();
    expect(body.hydration_ml_logged).toBe(400);
    expect(body.deduplicated).toBe(false);
  });
});

describe('207a Task 3: telemetry is unconditional for custom-beverage path', () => {
  it('writes hydration_log_sessions with user_beverage_id even when Math.random is 0.99', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-custom-2' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { telemetryPayloadHolder } = wireAdminMocks({
      ubRow: {
        hydration_source_kind: 'sports_drink',
        hydration_coefficient: 1.0,
        display_name: 'Electrolyte Blend',
      },
      forceRandomHigh: true,
    });

    const res = await POST(buildRequest({
      volume_ml: 500,
      beverage_kind: 'sports_drink',
      log_surface: 'floating_fab',
      user_beverage_id: '3637585d-66e4-446f-b9e3-7f1ad5a6bcd7',
    }));

    expect(res.status).toBe(200);
    expect(telemetryPayloadHolder.last).not.toBeNull();
    expect(telemetryPayloadHolder.last?.user_beverage_id).toBe('3637585d-66e4-446f-b9e3-7f1ad5a6bcd7');
    expect(telemetryPayloadHolder.last?.beverage_catalog_slug).toBeNull();
  });

  it('telemetry row carries the log_surface from the request', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-custom-2' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { telemetryPayloadHolder } = wireAdminMocks({
      ubRow: {
        hydration_source_kind: 'coffee_tea',
        hydration_coefficient: 1.0,
        display_name: 'Cold Brew House Blend',
      },
    });

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      user_beverage_id: '31abb75c-8cdc-4e45-8a53-9d3ce6a44237',
    }));

    expect(telemetryPayloadHolder.last?.log_surface).toBe('hydration_detail_view');
  });
});

describe('207a Task 3: fail-open when user_beverages lookup fails', () => {
  it('falls back to non-custom path and still writes meal_items when lookup throws', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-custom-3' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      ubError: new Error('DB connection lost'),
      ubRow: null,
    });

    const res = await POST(buildRequest({
      volume_ml: 300,
      beverage_kind: 'pure_water',
      log_surface: 'dashboard_widget',
      user_beverage_id: '85a63045-88f3-4bb6-8229-358f4b8aac88',
    }));

    // Route must not return 500; it falls back to existing behavior
    expect(res.status).toBe(200);
    // meal_items must still be written
    expect(itemInsertPayloadHolder.last).not.toBeNull();
    // In fallback, beverage_kind pure_water * 1.0 = 300 ml
    expect(itemInsertPayloadHolder.last?.hydration_ml).toBe(300);
  });

  it('falls back when user_beverages returns null (row not found)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-custom-3' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { itemInsertPayloadHolder } = wireAdminMocks({
      ubRow: null,
    });

    const res = await POST(buildRequest({
      volume_ml: 200,
      beverage_kind: 'coffee_tea',
      log_surface: 'floating_fab',
      user_beverage_id: 'bae503c5-cd81-4042-bce8-92e4cf4b14bb',
    }));

    expect(res.status).toBe(200);
    // Falls back to coffee_tea adjusted coefficient 1.0 = 200 ml
    expect(itemInsertPayloadHolder.last?.hydration_ml).toBe(200);
  });
});

describe('207a Task 3: non-custom path still uses 20pct sampling gate', () => {
  it('does NOT write telemetry when Math.random is 0.99 and no user_beverage_id', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-legacy-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    // Wire with no ubRow and no user_beverage_id in the request.
    // forceRandomHigh keeps Math.random at 0.99 so the 20pct gate blocks.
    const { telemetryPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      ubRow: null,
      forceRandomHigh: true,
    });

    await POST(buildRequest({
      volume_ml: 300,
      beverage_kind: 'pure_water',
      log_surface: 'dashboard_widget',
    }));

    // Sampling gate blocked; no telemetry row
    expect(telemetryPayloadHolder.last).toBeNull();
  });
});
