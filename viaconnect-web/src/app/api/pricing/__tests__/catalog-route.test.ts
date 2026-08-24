import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingCatalogError, loadPricingCatalog } from '@/lib/pricing/catalog';
import { GET } from '@/app/api/pricing/catalog/route';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

const mocks = vi.hoisted(() => ({
  tiersResult: { data: [] as unknown[], error: null as { message: string } | null },
  featuresResult: { data: [] as unknown[], error: null as { message: string } | null },
  hangTiers: false,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => makeCatalogClient(),
}));

function makeCatalogClient(): PricingSupabaseClient {
  const from = (table: string) => {
    const result = table === 'membership_tiers' ? mocks.tiersResult : mocks.featuresResult;
    const pending =
      table === 'membership_tiers' && mocks.hangTiers
        ? new Promise<{ data: unknown[] | null; error: { message: string } | null }>(() => undefined)
        : Promise.resolve(result);
    return {
      select: () => ({
        eq: () => {
          if (table === 'features') {
            return pending;
          }
          return {
            order: () => pending,
          };
        },
      }),
    };
  };
  return { from } as unknown as PricingSupabaseClient;
}

beforeEach(() => {
  mocks.hangTiers = false;
  mocks.tiersResult = {
    data: [
      {
        id: 'gold',
        display_name: 'Gold',
        tier_level: 1,
        monthly_price_cents: 888,
        annual_price_cents: 8800,
        annual_savings_cents: 1856,
        description: 'Gold',
        is_family_tier: false,
        base_adults_included: 1,
        base_children_included: 0,
        max_adults_allowed: 1,
        additional_adult_price_cents: null,
        additional_children_chunk_price_cents: null,
        children_chunk_size: null,
        sort_order: 1,
      },
    ],
    error: null,
  };
  mocks.featuresResult = {
    data: [
      {
        id: 'helix_rewards_basic',
        display_name: 'Helix Rewards Earning & Redemption',
        category: 'rewards',
        minimum_tier_level: 1,
        requires_family_tier: false,
        is_active: true,
        kill_switch_engaged: false,
      },
    ],
    error: null,
  };
});

describe('loadPricingCatalog', () => {
  it('returns live membership_tiers prices without inventing rows', async () => {
    const catalog = await loadPricingCatalog(makeCatalogClient(), 200);
    expect(catalog.tiers).toHaveLength(1);
    expect(catalog.tiers[0]?.monthly_price_cents).toBe(888);
    expect(catalog.features[0]?.id).toBe('helix_rewards_basic');
  });

  it('times out instead of spinning forever', async () => {
    mocks.hangTiers = true;
    await expect(loadPricingCatalog(makeCatalogClient(), 20)).rejects.toBeInstanceOf(
      PricingCatalogError,
    );
  });

  it('fails closed when membership_tiers errors; does not invent dollars', async () => {
    mocks.tiersResult = { data: null as unknown as unknown[], error: { message: 'permission denied' } };
    await expect(loadPricingCatalog(makeCatalogClient(), 200)).rejects.toMatchObject({
      status: 500,
    });
  });
});

describe('GET /api/pricing/catalog', () => {
  it('returns live tiers and features', async () => {
    const res = await GET(new Request('http://localhost/api/pricing/catalog'));
    expect(res.status).toBe(200);
    const body = await res.json() as { tiers: Array<{ id: string }>; features: Array<{ id: string }> };
    expect(body.tiers[0]?.id).toBe('gold');
    expect(body.features[0]?.id).toBe('helix_rewards_basic');
  });

  it('returns 500 with an error field when the live table cannot be read', async () => {
    mocks.tiersResult = { data: null as unknown as unknown[], error: { message: 'boom' } };
    const res = await GET(new Request('http://localhost/api/pricing/catalog'));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/live membership prices/i);
  });
});
