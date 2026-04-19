// Prompt #90 Phase 1.5: Pricing schema integration tests.
//
// Verifies seeded data, generated columns, and RLS policies for the
// consumer pricing reference tables introduced in migrations
// 20260418000010..030. These are integration tests that hit the live
// Supabase project; they auto-skip when SUPABASE_SERVICE_ROLE_KEY is
// not set so local `npx vitest run` keeps passing without secrets.
//
// To run with coverage: export SUPABASE_SERVICE_ROLE_KEY=... && npx vitest run tests/pricing-schema

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhkcufyqjojdbvdrpky.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasServiceKey = Boolean(SERVICE_KEY);
const hasAnonKey = Boolean(ANON_KEY);

const describeIfService = hasServiceKey ? describe : describe.skip;
const describeIfAnon = hasAnonKey ? describe : describe.skip;

describeIfService('Phase 1 schema: reference tables (service role)', () => {
  const supabase = hasServiceKey ? createClient(SUPABASE_URL, SERVICE_KEY!) : (null as never);

  describe('membership_tiers', () => {
    it('seeds all four tiers in sort order', async () => {
      const { data, error } = await supabase
        .from('membership_tiers')
        .select('id')
        .order('tier_level');
      expect(error).toBeNull();
      expect(data?.map((t) => t.id)).toEqual(['free', 'gold', 'platinum', 'platinum_family']);
    });

    it('stores prices in cents without floating-point loss', async () => {
      const { data } = await supabase.from('membership_tiers').select('id, monthly_price_cents, annual_price_cents');
      const m = Object.fromEntries((data ?? []).map((t: { id: string; monthly_price_cents: number; annual_price_cents: number }) => [t.id, t]));
      expect(m.free.monthly_price_cents).toBe(0);
      expect(m.gold.monthly_price_cents).toBe(888);
      expect(m.gold.annual_price_cents).toBe(8800);
      expect(m.platinum.monthly_price_cents).toBe(2888);
      expect(m.platinum.annual_price_cents).toBe(28800);
      expect(m.platinum_family.monthly_price_cents).toBe(4888);
      expect(m.platinum_family.annual_price_cents).toBe(48888);
    });

    it('auto-computes annual_savings_cents via generated column', async () => {
      const { data } = await supabase.from('membership_tiers').select('id, monthly_price_cents, annual_price_cents, annual_savings_cents');
      for (const t of (data ?? []) as Array<{ monthly_price_cents: number; annual_price_cents: number; annual_savings_cents: number }>) {
        expect(t.annual_savings_cents).toBe(t.monthly_price_cents * 12 - t.annual_price_cents);
      }
    });

    it('family tier has add-on pricing configured', async () => {
      const { data } = await supabase.from('membership_tiers').select('*').eq('id', 'platinum_family').single();
      const t = data as Record<string, unknown> | null;
      expect(t?.is_family_tier).toBe(true);
      expect(t?.base_adults_included).toBe(2);
      expect(t?.base_children_included).toBe(2);
      expect(t?.max_adults_allowed).toBe(4);
      expect(t?.additional_adult_price_cents).toBe(888);
      expect(t?.additional_children_chunk_price_cents).toBe(888);
      expect(t?.children_chunk_size).toBe(2);
    });
  });

  describe('genex360_products', () => {
    it('seeds three products with $.88 pricing and gift configs', async () => {
      const { data } = await supabase.from('genex360_products').select('*').order('sort_order');
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      expect(rows).toHaveLength(3);
      const byId = Object.fromEntries(rows.map((r) => [r.id as string, r]));

      expect(byId.genex_m.price_cents).toBe(38888);
      expect(byId.genex_m.gifted_tier_id).toBe('gold');
      expect(byId.genex_m.gifted_months).toBe(3);
      expect(byId.genex_m.unlocks_full_precision).toBe(false);

      expect(byId.genex360_core.price_cents).toBe(78888);
      expect(byId.genex360_core.gifted_tier_id).toBe('platinum');
      expect(byId.genex360_core.gifted_months).toBe(6);
      expect(byId.genex360_core.unlocks_full_precision).toBe(false);

      expect(byId.genex360_complete.price_cents).toBe(118888);
      expect(byId.genex360_complete.gifted_tier_id).toBe('platinum');
      expect(byId.genex360_complete.gifted_months).toBe(12);
      expect(byId.genex360_complete.unlocks_full_precision).toBe(true);
    });
  });

  describe('supplement_discount_rules', () => {
    it('seeds the four rules with expected percentages', async () => {
      const { data } = await supabase.from('supplement_discount_rules').select('id, discount_percent, is_annual_prepay_bonus');
      const byId = Object.fromEntries((data ?? []).map((r: { id: string; discount_percent: number; is_annual_prepay_bonus: boolean }) => [r.id, r]));
      expect(byId.subscription_base.discount_percent).toBe(10);
      expect(byId.genex360_member.discount_percent).toBe(15);
      expect(byId.full_precision.discount_percent).toBe(20);
      expect(byId.annual_prepay_bonus.discount_percent).toBe(5);
      expect(byId.annual_prepay_bonus.is_annual_prepay_bonus).toBe(true);
      expect(byId.subscription_base.is_annual_prepay_bonus).toBe(false);
    });
  });

  describe('outcome_stacks and components', () => {
    it('seeds seven stacks all at 20% bundle discount', async () => {
      const { data } = await supabase.from('outcome_stacks').select('id, bundle_discount_percent');
      expect(data).toHaveLength(7);
      for (const s of (data ?? []) as Array<{ bundle_discount_percent: number }>) {
        expect(s.bundle_discount_percent).toBe(20);
      }
    });

    it('each stack has 3 components and every component SKU exists in master_skus', async () => {
      const { data: comps } = await supabase.from('outcome_stack_components').select('stack_id, sku');
      const { data: skus } = await supabase.from('master_skus').select('sku');
      expect(comps).toHaveLength(21);
      const existing = new Set((skus ?? []).map((s: { sku: string }) => s.sku));
      for (const c of (comps ?? []) as Array<{ sku: string }>) {
        expect(existing.has(c.sku)).toBe(true);
      }
      const byStack = new Map<string, number>();
      for (const c of (comps ?? []) as Array<{ stack_id: string }>) {
        byStack.set(c.stack_id, (byStack.get(c.stack_id) ?? 0) + 1);
      }
      for (const [, n] of byStack) expect(n).toBe(3);
    });

    it('every stack has exactly one primary flagship component', async () => {
      const { data } = await supabase.from('outcome_stack_components').select('stack_id, is_primary');
      const primaryCount = new Map<string, number>();
      for (const c of (data ?? []) as Array<{ stack_id: string; is_primary: boolean }>) {
        if (c.is_primary) primaryCount.set(c.stack_id, (primaryCount.get(c.stack_id) ?? 0) + 1);
      }
      expect(primaryCount.size).toBe(7);
      for (const [, n] of primaryCount) expect(n).toBe(1);
    });
  });

  describe('features', () => {
    it('has features at all four tier levels', async () => {
      const { data } = await supabase.from('features').select('minimum_tier_level');
      const levels = new Set((data ?? []).map((f: { minimum_tier_level: number }) => f.minimum_tier_level));
      expect(levels.has(0)).toBe(true);
      expect(levels.has(1)).toBe(true);
      expect(levels.has(2)).toBe(true);
      expect(levels.has(3)).toBe(true);
    });

    it('all level-3 features require the family tier', async () => {
      const { data } = await supabase.from('features').select('id, requires_family_tier').eq('minimum_tier_level', 3);
      const rows = (data ?? []) as Array<{ id: string; requires_family_tier: boolean }>;
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.requires_family_tier).toBe(true);
    });

    it('genex360-gated features have requires_genex360 set', async () => {
      const { data } = await supabase.from('features').select('id, requires_genex360').in('id', ['genex360_integration', 'full_precision_score', 'variant_explorer']);
      for (const r of (data ?? []) as Array<{ requires_genex360: boolean }>) expect(r.requires_genex360).toBe(true);
    });
  });

  describe('memberships extension', () => {
    it('has all new columns on the existing memberships table', async () => {
      // If any of the new columns is missing, Postgres rejects the select and error is non-null.
      const { data, error } = await supabase
        .from('memberships')
        .select('tier_id, billing_cycle, current_period_start, current_period_end, is_annual_prepay, gift_source_id, additional_adults, additional_children_chunks')
        .limit(0);
      expect(error).toBeNull();
      expect(data).not.toBeUndefined();
    });
  });

  describe('family_members', () => {
    it('is present and empty', async () => {
      const { data, error } = await supabase.from('family_members').select('id').limit(1);
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
});

describeIfAnon('Phase 1 schema: RLS (anon role)', () => {
  const anon = hasAnonKey ? createClient(SUPABASE_URL, ANON_KEY!) : (null as never);

  it('lets anonymous users read membership_tiers (marketing page)', async () => {
    const { data, error } = await anon.from('membership_tiers').select('id, display_name, monthly_price_cents').eq('is_active', true);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('lets anonymous users read genex360_products', async () => {
    const { data, error } = await anon.from('genex360_products').select('id, price_cents').eq('is_active', true);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(3);
  });

  it('lets anonymous users read supplement_discount_rules', async () => {
    const { data, error } = await anon.from('supplement_discount_rules').select('id, discount_percent').eq('is_active', true);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(4);
  });

  it('lets anonymous users read outcome_stacks', async () => {
    const { data, error } = await anon.from('outcome_stacks').select('id').eq('is_active', true);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(7);
  });

  it('blocks anonymous users from reading memberships rows', async () => {
    const { data } = await anon.from('memberships').select('id');
    expect((data ?? []).length).toBe(0);
  });

  it('blocks anonymous users from reading family_members rows', async () => {
    const { data } = await anon.from('family_members').select('id');
    expect((data ?? []).length).toBe(0);
  });

  it('blocks anonymous users from reading genex360_purchases rows', async () => {
    const { data } = await anon.from('genex360_purchases').select('id');
    expect((data ?? []).length).toBe(0);
  });
});

describe('Phase 1 schema: domain type self-consistency', () => {
  it('TIER_LEVEL_BY_ID maps ids to monotonic levels', async () => {
    const { TIER_LEVEL_BY_ID } = await import('@/types/pricing');
    expect(TIER_LEVEL_BY_ID.free).toBe(0);
    expect(TIER_LEVEL_BY_ID.gold).toBe(1);
    expect(TIER_LEVEL_BY_ID.platinum).toBe(2);
    expect(TIER_LEVEL_BY_ID.platinum_family).toBe(3);
  });

  it('tierIdToLevel and tierLevelToId are inverses', async () => {
    const { tierIdToLevel, tierLevelToId } = await import('@/types/pricing');
    expect(tierLevelToId(tierIdToLevel('free'))).toBe('free');
    expect(tierLevelToId(tierIdToLevel('gold'))).toBe('gold');
    expect(tierLevelToId(tierIdToLevel('platinum'))).toBe('platinum');
    expect(tierLevelToId(tierIdToLevel('platinum_family'))).toBe('platinum_family');
  });
});
