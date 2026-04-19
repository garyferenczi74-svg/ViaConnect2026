// Prompt #92 Phase 2: earning-engine pure-logic tests.
// Exercises the deterministic math in the earning pipeline without hitting
// the database. The DB-backed variants are exercised in integration tests.

import { describe, it, expect } from 'vitest';
import { computeHelixTier, computeTierInfo } from '@/lib/helix/tier-progression';
import { resolveRouting } from '@/lib/helix/family-pool-manager';
import { applyMultiplier, cutoffFor } from '@/lib/helix/earning-engine';
import type { HelixTier } from '@/types/helix';

function tierRow(
  tier: string,
  multiplier: number,
  required: string,
  minPoints: number,
): HelixTier {
  return {
    tier,
    multiplier,
    required_membership_tier_id: required,
    min_engagement_points: minPoints,
    min_points: minPoints,
    tier_icon_lucide_name: tier === 'bronze' ? 'Medal' : tier === 'silver' ? 'Award' : tier === 'gold' ? 'Trophy' : 'Crown',
    tier_description: `${tier} tier`,
    benefits: null,
  } as unknown as HelixTier;
}

const TIERS: HelixTier[] = [
  tierRow('bronze', 1.0, 'gold', 0),
  tierRow('silver', 1.5, 'gold', 500),
  tierRow('gold', 2.0, 'gold', 2000),
  tierRow('platinum', 5.0, 'platinum', 0),
];

describe('computeHelixTier', () => {
  it('free members have no Helix tier and zero multiplier', () => {
    const r = computeHelixTier({ currentTier: 'free', tierLevel: 0 }, 10_000, TIERS);
    expect(r.tierId).toBeNull();
    expect(r.earningMultiplier).toBe(0);
    expect(r.source).toBe('free_excluded');
  });

  it('platinum members always earn at 5x regardless of points', () => {
    const r = computeHelixTier({ currentTier: 'platinum', tierLevel: 2 }, 0, TIERS);
    expect(r.tierId).toBe('platinum');
    expect(r.earningMultiplier).toBe(5.0);
    expect(r.source).toBe('platinum_membership');
  });

  it('platinum+ family members always earn at 5x', () => {
    const r = computeHelixTier({ currentTier: 'platinum_family', tierLevel: 3 }, 50, TIERS);
    expect(r.tierId).toBe('platinum');
    expect(r.earningMultiplier).toBe(5.0);
    expect(r.source).toBe('platinum_membership');
  });

  it('gold member with 0 points starts at bronze (1x)', () => {
    const r = computeHelixTier({ currentTier: 'gold', tierLevel: 1 }, 0, TIERS);
    expect(r.tierId).toBe('bronze');
    expect(r.earningMultiplier).toBe(1.0);
  });

  it('gold member at 500 points is silver (1.5x)', () => {
    const r = computeHelixTier({ currentTier: 'gold', tierLevel: 1 }, 500, TIERS);
    expect(r.tierId).toBe('silver');
    expect(r.earningMultiplier).toBe(1.5);
  });

  it('gold member at 499 points is still bronze', () => {
    const r = computeHelixTier({ currentTier: 'gold', tierLevel: 1 }, 499, TIERS);
    expect(r.tierId).toBe('bronze');
    expect(r.earningMultiplier).toBe(1.0);
  });

  it('gold member at 2000 points is gold Helix tier (2x)', () => {
    const r = computeHelixTier({ currentTier: 'gold', tierLevel: 1 }, 2000, TIERS);
    expect(r.tierId).toBe('gold');
    expect(r.earningMultiplier).toBe(2.0);
  });

  it('gold member at 50_000 points stays at gold tier (does not jump to platinum)', () => {
    const r = computeHelixTier({ currentTier: 'gold', tierLevel: 1 }, 50_000, TIERS);
    expect(r.tierId).toBe('gold');
    expect(r.earningMultiplier).toBe(2.0);
  });
});

describe('computeTierInfo progression display', () => {
  it('bronze user at 0 points shows next=silver at 500', () => {
    const info = computeTierInfo({ currentTier: 'gold', tierLevel: 1 }, 0, TIERS);
    expect(info?.tierId).toBe('bronze');
    expect(info?.nextTierId).toBe('silver');
    expect(info?.nextTierPoints).toBe(500);
    expect(info?.progressPercent).toBe(0);
  });

  it('bronze user at 250 points shows 50% progress to silver', () => {
    const info = computeTierInfo({ currentTier: 'gold', tierLevel: 1 }, 250, TIERS);
    expect(info?.tierId).toBe('bronze');
    expect(info?.progressPercent).toBe(50);
  });

  it('gold (helix) user has no next tier in gold gate', () => {
    const info = computeTierInfo({ currentTier: 'gold', tierLevel: 1 }, 3000, TIERS);
    expect(info?.tierId).toBe('gold');
    expect(info?.nextTierId).toBeNull();
    expect(info?.progressPercent).toBe(100);
  });

  it('platinum member has no next tier', () => {
    const info = computeTierInfo({ currentTier: 'platinum', tierLevel: 2 }, 0, TIERS);
    expect(info?.tierId).toBe('platinum');
    expect(info?.nextTierId).toBeNull();
  });

  it('free member yields null', () => {
    const info = computeTierInfo({ currentTier: 'free', tierLevel: 0 }, 0, TIERS);
    expect(info).toBeNull();
  });
});

describe('resolveRouting', () => {
  it('non-family routes to individual', () => {
    const r = resolveRouting({ userId: 'u1', isFamilyTier: false, isPrimary: true, primaryUserId: null, configuredPoolType: 'shared' });
    expect(r.targetUserId).toBe('u1');
    expect(r.poolType).toBe('individual');
    expect(r.primaryUserId).toBeNull();
  });

  it('family shared pool routes family member earnings to primary', () => {
    const r = resolveRouting({ userId: 'child', isFamilyTier: true, isPrimary: false, primaryUserId: 'parent', configuredPoolType: 'shared' });
    expect(r.targetUserId).toBe('parent');
    expect(r.poolType).toBe('shared_family');
    expect(r.primaryUserId).toBe('parent');
  });

  it('family shared pool: primary earning stays on primary', () => {
    const r = resolveRouting({ userId: 'parent', isFamilyTier: true, isPrimary: true, primaryUserId: 'parent', configuredPoolType: 'shared' });
    expect(r.targetUserId).toBe('parent');
    expect(r.poolType).toBe('shared_family');
  });

  it('family individual pool routes each member to themselves', () => {
    const r = resolveRouting({ userId: 'child', isFamilyTier: true, isPrimary: false, primaryUserId: 'parent', configuredPoolType: 'individual' });
    expect(r.targetUserId).toBe('child');
    expect(r.poolType).toBe('individual');
    expect(r.primaryUserId).toBe('parent'); // still tracked for audit
  });
});

describe('applyMultiplier', () => {
  it('rounds to nearest integer', () => {
    expect(applyMultiplier(10, 1.5)).toBe(15);
    expect(applyMultiplier(10, 2.0)).toBe(20);
    expect(applyMultiplier(10, 5.0)).toBe(50);
    expect(applyMultiplier(7, 1.5)).toBe(11); // 10.5 rounds to 11
  });
  it('zero when inputs are zero or negative', () => {
    expect(applyMultiplier(0, 1.5)).toBe(0);
    expect(applyMultiplier(10, 0)).toBe(0);
    expect(applyMultiplier(-5, 1.5)).toBe(0);
  });
});

describe('cutoffFor frequency limits', () => {
  const now = new Date('2026-04-18T12:00:00Z').getTime();

  it('unlimited and null return null (no cutoff)', () => {
    expect(cutoffFor('unlimited', now)).toBeNull();
    expect(cutoffFor(null, now)).toBeNull();
    expect(cutoffFor(undefined, now)).toBeNull();
  });
  it('once_per_day subtracts 24 hours', () => {
    const c = cutoffFor('once_per_day', now);
    expect(c?.toISOString()).toBe('2026-04-17T12:00:00.000Z');
  });
  it('once_per_week subtracts 7 days', () => {
    const c = cutoffFor('once_per_week', now);
    expect(c?.toISOString()).toBe('2026-04-11T12:00:00.000Z');
  });
  it('once_per_month subtracts 1 month', () => {
    const c = cutoffFor('once_per_month', now);
    expect(c?.toISOString()).toBe('2026-03-18T12:00:00.000Z');
  });
  it('once_per_lifetime subtracts 100 years', () => {
    const c = cutoffFor('once_per_lifetime', now);
    expect(c?.getUTCFullYear()).toBe(1926);
  });
});
