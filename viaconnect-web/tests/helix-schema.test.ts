// Prompt #92 Phase 1: Helix schema + firewall integration tests.
// Auto-skip when SUPABASE_SERVICE_ROLE_KEY is not set.

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhkcufyqjojdbvdrpky.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasService = Boolean(SERVICE_KEY);
const hasAnon = Boolean(ANON_KEY);
const describeIfService = hasService ? describe : describe.skip;
const describeIfAnon = hasAnon ? describe : describe.skip;

describeIfService('Phase 1: helix_tiers extension (service role)', () => {
  const db = hasService ? createClient(SUPABASE_URL, SERVICE_KEY!) : (null as never);

  it('all four tiers have required_membership_tier_id populated', async () => {
    const { data } = await db.from('helix_tiers').select('tier, required_membership_tier_id, min_engagement_points, tier_icon_lucide_name');
    const rows = (data ?? []) as Array<{ tier: string; required_membership_tier_id: string | null; min_engagement_points: number; tier_icon_lucide_name: string }>;
    const byTier = Object.fromEntries(rows.map((r) => [r.tier.toLowerCase(), r]));
    expect(byTier.bronze.required_membership_tier_id).toBe('gold');
    expect(byTier.silver.required_membership_tier_id).toBe('gold');
    expect(byTier.gold.required_membership_tier_id).toBe('gold');
    expect(byTier.platinum.required_membership_tier_id).toBe('platinum');
  });

  it('Platinum Helix tier is membership-gated, not points-gated', async () => {
    const { data } = await db.from('helix_tiers').select('tier, min_engagement_points').ilike('tier', 'platinum').single();
    expect((data as { min_engagement_points: number } | null)?.min_engagement_points).toBe(0);
  });

  it('Existing multipliers preserved (1.0/1.5/2.0/5.0)', async () => {
    const { data } = await db.from('helix_tiers').select('tier, multiplier');
    const byTier = Object.fromEntries(((data ?? []) as Array<{ tier: string; multiplier: number }>).map((r) => [r.tier.toLowerCase(), Number(r.multiplier)]));
    expect(byTier.bronze).toBe(1.0);
    expect(byTier.silver).toBe(1.5);
    expect(byTier.gold).toBe(2.0);
    expect(byTier.platinum).toBe(5.0);
  });
});

describeIfService('Phase 1: practitioner stub tables', () => {
  const db = hasService ? createClient(SUPABASE_URL, SERVICE_KEY!) : (null as never);

  // Path C reconciliation: practitioners now uses account_status (5-state)
  // instead of the original stub status (4-state). The patient ↔ practitioner
  // relationship table is the canonical practitioner_patients (extended in
  // _110), not the patient_practitioner_relationships shim that _050 created
  // and _160 dropped.
  it('practitioners table exists with reconciled Phase 2 columns', async () => {
    const { error } = await (db as any).from('practitioners')
      .select('id, user_id, display_name, account_status, credential_type, practice_name')
      .limit(0);
    expect(error).toBeNull();
  });

  it('practitioner_patients carries the consent_share_engagement_score flag', async () => {
    const { error } = await (db as any).from('practitioner_patients')
      .select('id, patient_id, practitioner_id, status, consent_share_engagement_score')
      .limit(0);
    expect(error).toBeNull();
  });
});

describeIfService('Phase 1: family pool + engagement score tables', () => {
  const db = hasService ? createClient(SUPABASE_URL, SERVICE_KEY!) : (null as never);

  it('helix_family_pool_config created with shared default', async () => {
    const { error } = await db.from('helix_family_pool_config').select('id, primary_user_id, pool_type').limit(0);
    expect(error).toBeNull();
  });

  it('engagement_score_snapshots has all four component columns', async () => {
    const { error } = await db.from('engagement_score_snapshots')
      .select('id, user_id, score, protocol_adherence_score, assessment_engagement_score, tracking_consistency_score, outcome_trajectory_score')
      .limit(0);
    expect(error).toBeNull();
  });
});

describeIfService('Phase 1: earning event catalog', () => {
  const db = hasService ? createClient(SUPABASE_URL, SERVICE_KEY!) : (null as never);

  it('seeds at least 20 earning event types', async () => {
    const { data } = await db.from('helix_earning_event_types').select('id', { count: 'exact' });
    expect((data ?? []).length).toBeGreaterThanOrEqual(20);
  });

  it('has the canonical GeneX360 events', async () => {
    const { data } = await db.from('helix_earning_event_types')
      .select('id, base_points, frequency_limit')
      .in('id', ['genex360_m_purchase','genex360_core_purchase','genex360_complete_purchase']);
    const byId = Object.fromEntries(((data ?? []) as Array<{ id: string; base_points: number; frequency_limit: string }>).map((r) => [r.id, r]));
    expect(byId.genex360_m_purchase.base_points).toBe(388);
    expect(byId.genex360_core_purchase.base_points).toBe(788);
    expect(byId.genex360_complete_purchase.base_points).toBe(1188);
    expect(byId.genex360_complete_purchase.frequency_limit).toBe('once_per_lifetime');
  });

  it('has referral events at tier multiplier entry points', async () => {
    const { data } = await db.from('helix_earning_event_types')
      .select('id, base_points')
      .in('id', ['referral_signup','referral_first_purchase','referral_genex360']);
    const byId = Object.fromEntries(((data ?? []) as Array<{ id: string; base_points: number }>).map((r) => [r.id, r.base_points]));
    expect(byId.referral_signup).toBe(100);
    expect(byId.referral_first_purchase).toBe(500);
    expect(byId.referral_genex360).toBe(1000);
  });
});

describeIfService('Phase 1: firewall smoke check', () => {
  const db = hasService ? createClient(SUPABASE_URL, SERVICE_KEY!) : (null as never);

  it('our Phase 1 tables are reachable (migration applied cleanly)', async () => {
    const { error } = await db.from('helix_family_pool_config').select('id').limit(0);
    expect(error).toBeNull();
  });
});

describeIfAnon('Phase 1: RLS (anon role)', () => {
  const anon = hasAnon ? createClient(SUPABASE_URL, ANON_KEY!) : (null as never);

  it('anonymous users can read earning events', async () => {
    const { data, error } = await anon.from('helix_earning_event_types').select('id').eq('is_active', true);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('anonymous users cannot read engagement_score_snapshots', async () => {
    const { data } = await anon.from('engagement_score_snapshots').select('id');
    expect((data ?? []).length).toBe(0);
  });

  it('anonymous users cannot read helix_balances', async () => {
    const { data } = await anon.from('helix_balances').select('id');
    expect((data ?? []).length).toBe(0);
  });

  it('anonymous users cannot read helix_transactions', async () => {
    const { data } = await anon.from('helix_transactions').select('id');
    expect((data ?? []).length).toBe(0);
  });

  it('anonymous users cannot read practitioner_patients', async () => {
    const { data } = await (anon as any).from('practitioner_patients').select('id');
    expect((data ?? []).length).toBe(0);
  });
});

// Type-check smoke: these imports fail at compile time if the regenerated
// Database type is missing any of the Phase 1 tables, giving us a static
// guarantee without running a runtime assertion. patient_practitioner_relationships
// was dropped by Path C reconciliation (`_160`); practitioner_patients is the
// canonical relationship table.
import type { Database } from '@/lib/supabase/types';
type _Engagement = Database['public']['Tables']['engagement_score_snapshots']['Row'];
type _Practitioner = Database['public']['Tables']['practitioners']['Row'];
type _FamilyPool = Database['public']['Tables']['helix_family_pool_config']['Row'];
type _EarningEvent = Database['public']['Tables']['helix_earning_event_types']['Row'];
