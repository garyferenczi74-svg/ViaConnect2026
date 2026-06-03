/**
 * Prompt 172e Phase F route integration tests: telemetry shape + Helix
 * event emission.
 *
 * Phase F layers two behaviors on top of the Phase A through D route:
 *   1. when the 20pct telemetry sample fires, the insert payload carries
 *      the three new columns beverage_catalog_slug, effective_volume_bucket,
 *      and caffeine_contributed_flag, with no spec section 12 forbidden
 *      field ever present on the insert
 *   2. when the request body carries a beverage_slug and the route
 *      writes the meal_item, the route fires the
 *      nutrivision_hydration_catalog_log Helix event; if the user just
 *      crossed three distinct catalog categories today, it also fires
 *      nutrivision_hydration_catalog_diversity_3
 *
 * Phase F is consumer portal only by inheritance; the helix earning
 * engine rejects free tier users upstream. The legacy 170o quick log
 * button paths (no beverage_slug) never emit Phase F Helix events.
 *
 * Math.random is stubbed to force the 20pct telemetry sample on so the
 * Phase F insert path is observable.
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

function wireAdminMocks(args: {
  profileCountingMode?: 'conservative' | 'adjusted';
  catalogRow?: Record<string, unknown> | null;
  alcoholicCountToday?: number;
  mealInsertReturn?: { meal_id: string } | null;
  mealInsertError?: unknown;
  forceSampleOn?: boolean;
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

  const telemetryPayloadHolder: { last: Record<string, unknown> | null } = { last: null };
  const telemetryInsert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    telemetryPayloadHolder.last = payload;
    return Promise.resolve({ error: null });
  });

  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return { select: profileSelect };
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

  // Force the 20pct telemetry sample on so the insert path is observable.
  if (args.forceSampleOn !== false) {
    vi.spyOn(Math, 'random').mockReturnValue(0.05);
  } else {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  }

  return { itemInsertPayloadHolder, telemetryPayloadHolder, telemetryInsert };
}

describe('Phase F: telemetry payload shape on a catalog driven log', () => {
  it('writes the three new columns when beverage_slug is present and sample fires', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { telemetryPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'coffee_drip',
        display_name: 'Drip Coffee',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 95,
        is_alcoholic: false,
      },
      forceSampleOn: true,
    });

    const res = await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    expect(res.status).toBe(200);
    expect(telemetryPayloadHolder.last).not.toBeNull();
    expect(telemetryPayloadHolder.last?.beverage_catalog_slug).toBe('coffee_drip');
    expect(telemetryPayloadHolder.last?.effective_volume_bucket).toBe('100-250ml');
    expect(telemetryPayloadHolder.last?.caffeine_contributed_flag).toBe(true);
  });

  it('writes flag false for a zero caffeine catalog row (herbal tea)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { telemetryPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'tea_herbal',
        display_name: 'Herbal Tea',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 0,
        is_alcoholic: false,
      },
      forceSampleOn: true,
    });

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'tea_herbal',
    }));

    expect(telemetryPayloadHolder.last?.beverage_catalog_slug).toBe('tea_herbal');
    expect(telemetryPayloadHolder.last?.effective_volume_bucket).toBe('100-250ml');
    expect(telemetryPayloadHolder.last?.caffeine_contributed_flag).toBe(false);
  });

  it('writes null slug and false flag on legacy 170o quick log (no beverage_slug)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { telemetryPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: null,
      forceSampleOn: true,
    });

    await POST(buildRequest({
      volume_ml: 500,
      beverage_kind: 'pure_water',
      log_surface: 'dashboard_widget',
    }));

    expect(telemetryPayloadHolder.last?.beverage_catalog_slug).toBeNull();
    expect(telemetryPayloadHolder.last?.effective_volume_bucket).toBe('500-750ml');
    expect(telemetryPayloadHolder.last?.caffeine_contributed_flag).toBe(false);
  });

  it('never writes safety_mode_enabled or raw mg fields to telemetry', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    const { telemetryPayloadHolder } = wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'coffee_drip',
        display_name: 'Drip Coffee',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 95,
        is_alcoholic: false,
      },
      forceSampleOn: true,
    });

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    const payload = telemetryPayloadHolder.last ?? {};
    expect(payload).not.toHaveProperty('safety_mode_enabled');
    expect(payload).not.toHaveProperty('caffeine_mg');
    expect(payload).not.toHaveProperty('sodium_mg');
    expect(payload).not.toHaveProperty('potassium_mg');
    expect(payload).not.toHaveProperty('magnesium_mg');
    expect(payload).not.toHaveProperty('sugar_g');
    expect(payload).not.toHaveProperty('kcal_per_serving');
    expect(payload).not.toHaveProperty('user_id');
  });
});

describe('Phase F: Helix event emission on catalog driven logs', () => {
  it('emits nutrivision_hydration_catalog_log when a catalog row drives the log', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'coffee_drip',
        display_name: 'Drip Coffee',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 95,
        is_alcoholic: false,
      },
    });
    mocks.countDistinctCatalogCategoriesToday.mockResolvedValue(1);

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    const calls = mocks.creditEarning.mock.calls;
    const eventTypeIds = calls.map((c) => (c[1] as { eventTypeId: string }).eventTypeId);
    expect(eventTypeIds).toContain('nutrivision_hydration_catalog_log');
  });

  it('does not emit Phase F events on legacy 170o quick log button paths (no beverage_slug)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: null,
    });

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'pure_water',
      log_surface: 'dashboard_widget',
    }));

    expect(mocks.creditEarning).not.toHaveBeenCalled();
  });

  it('does not emit Phase F events on a dedup hit (short circuit precedes the new path)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: true,
      reference_meal_id: 'existing-meal',
    });
    wireAdminMocks({
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
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    expect(mocks.creditEarning).not.toHaveBeenCalled();
  });

  it('emits diversity_3 when today distinct category count just crossed 3', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'juice_orange',
        display_name: 'Orange Juice',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 0,
        is_alcoholic: false,
      },
    });
    // After this log lands, the user has 3 distinct categories today
    mocks.countDistinctCatalogCategoriesToday.mockResolvedValue(3);

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'juice_smoothie',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'juice_orange',
    }));

    const calls = mocks.creditEarning.mock.calls;
    const eventTypeIds = calls.map((c) => (c[1] as { eventTypeId: string }).eventTypeId);
    expect(eventTypeIds).toContain('nutrivision_hydration_catalog_diversity_3');
  });

  it('does not emit diversity_3 when today distinct category count is below 3', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'coffee_drip',
        display_name: 'Drip Coffee',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 95,
        is_alcoholic: false,
      },
    });
    mocks.countDistinctCatalogCategoriesToday.mockResolvedValue(2);

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'coffee_tea',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'coffee_drip',
    }));

    const calls = mocks.creditEarning.mock.calls;
    const eventTypeIds = calls.map((c) => (c[1] as { eventTypeId: string }).eventTypeId);
    expect(eventTypeIds).not.toContain('nutrivision_hydration_catalog_diversity_3');
    expect(eventTypeIds).toContain('nutrivision_hydration_catalog_log');
  });

  it('does not emit diversity_3 when count is 4 or more (only the crossing moment fires)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.checkHydrationDeduplication.mockResolvedValueOnce({
      deduplicated: false,
      reference_meal_id: null,
    });
    wireAdminMocks({
      profileCountingMode: 'adjusted',
      catalogRow: {
        slug: 'water_still',
        display_name: 'Still Water',
        default_volume_ml: 240,
        caffeine_mg_per_serving: 0,
        is_alcoholic: false,
      },
    });
    // The user already had 4 distinct categories before this log; this log
    // does not cross the threshold. The frequency_limit once_per_day
    // catches re emissions anyway but the route also gates on the exact
    // crossing moment so we do not pile up spurious creditEarning calls.
    mocks.countDistinctCatalogCategoriesToday.mockResolvedValue(5);

    await POST(buildRequest({
      volume_ml: 240,
      beverage_kind: 'pure_water',
      log_surface: 'hydration_detail_view',
      beverage_slug: 'water_still',
    }));

    const calls = mocks.creditEarning.mock.calls;
    const eventTypeIds = calls.map((c) => (c[1] as { eventTypeId: string }).eventTypeId);
    expect(eventTypeIds).not.toContain('nutrivision_hydration_catalog_diversity_3');
  });
});
