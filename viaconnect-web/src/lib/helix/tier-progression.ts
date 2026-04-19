// Prompt #92 Phase 2: Helix tier progression.
//
// Pure logic that maps (consumer tier, lifetime points, seeded helix_tiers rows)
// onto the user's current Helix tier + earning multiplier. The DB-backed
// variant is a thin wrapper that reads helix_tiers once and caches it.

import type { UserPricingContext, TierId } from '@/types/pricing';
import type { HelixTier, HelixTierId, HelixTierInfo } from '@/types/helix';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

export interface TierResolution {
  tierId: HelixTierId | null;
  earningMultiplier: number;
  source: 'free_excluded' | 'platinum_membership' | 'points_threshold' | 'fallback_bronze';
}

/** Pure: given the user's consumer pricing context, their lifetime earned
 *  points, and the seeded helix_tiers rows, resolve the current Helix tier. */
export function computeHelixTier(
  pricingContext: Pick<UserPricingContext, 'currentTier' | 'tierLevel'>,
  lifetimePoints: number,
  tierRows: HelixTier[],
): TierResolution {
  // Free users are excluded from Helix entirely.
  if (pricingContext.tierLevel === 0) {
    return { tierId: null, earningMultiplier: 0, source: 'free_excluded' };
  }

  // Platinum and Platinum+ Family always earn at the platinum Helix tier.
  if (pricingContext.tierLevel >= 2) {
    const platinum = tierRows.find((t) => t.tier?.toLowerCase() === 'platinum');
    if (platinum) {
      return {
        tierId: 'platinum' as HelixTierId,
        earningMultiplier: Number(platinum.multiplier ?? 5.0),
        source: 'platinum_membership',
      };
    }
  }

  // Gold members progress Bronze -> Silver -> Gold based on lifetime points.
  const goldGate = tierRows
    .filter((t) => t.required_membership_tier_id === 'gold')
    .sort((a, b) => (b.min_engagement_points ?? 0) - (a.min_engagement_points ?? 0));

  for (const tier of goldGate) {
    if (lifetimePoints >= (tier.min_engagement_points ?? 0)) {
      return {
        tierId: (tier.tier?.toLowerCase() ?? 'bronze') as HelixTierId,
        earningMultiplier: Number(tier.multiplier ?? 1.0),
        source: 'points_threshold',
      };
    }
  }

  // Fallback: any gold-gated tier available, use the lowest (bronze)
  const bronze = tierRows.find((t) => t.tier?.toLowerCase() === 'bronze');
  if (bronze) {
    return {
      tierId: 'bronze',
      earningMultiplier: Number(bronze.multiplier ?? 1.0),
      source: 'fallback_bronze',
    };
  }

  return { tierId: 'bronze', earningMultiplier: 1.0, source: 'fallback_bronze' };
}

/** Pure: compute the progression info for UI display (current tier, next tier,
 *  progress percent). Returns null for free users. */
export function computeTierInfo(
  pricingContext: Pick<UserPricingContext, 'currentTier' | 'tierLevel'>,
  lifetimePoints: number,
  tierRows: HelixTier[],
): HelixTierInfo | null {
  const resolution = computeHelixTier(pricingContext, lifetimePoints, tierRows);
  if (!resolution.tierId) return null;

  const currentRow = tierRows.find((t) => t.tier?.toLowerCase() === resolution.tierId);
  if (!currentRow) return null;

  // Determine next tier within the user's membership gate.
  const sameGateTiers = tierRows
    .filter((t) => t.required_membership_tier_id === currentRow.required_membership_tier_id)
    .sort((a, b) => (a.min_engagement_points ?? 0) - (b.min_engagement_points ?? 0));

  const currentIndex = sameGateTiers.findIndex((t) => t.tier === currentRow.tier);
  const nextRow = currentIndex >= 0 && currentIndex + 1 < sameGateTiers.length ? sameGateTiers[currentIndex + 1] : null;

  const currentThreshold = currentRow.min_engagement_points ?? 0;
  const nextThreshold = nextRow?.min_engagement_points ?? null;

  let progressPercent = 100;
  if (nextThreshold !== null && nextThreshold > currentThreshold) {
    const span = nextThreshold - currentThreshold;
    const into = Math.max(0, lifetimePoints - currentThreshold);
    progressPercent = Math.min(100, Math.round((into / span) * 100));
  }

  return {
    tierId: resolution.tierId,
    tierLabel: currentRow.tier ?? 'Bronze',
    earningMultiplier: Number(currentRow.multiplier ?? 1.0),
    currentLifetimePoints: lifetimePoints,
    nextTierId: nextRow ? ((nextRow.tier?.toLowerCase() ?? null) as HelixTierId | null) : null,
    nextTierPoints: nextThreshold,
    progressPercent,
    iconName: currentRow.tier_icon_lucide_name ?? 'Award',
    description: currentRow.tier_description ?? '',
  };
}

// ---------- DB-backed wrappers ----------------------------------------------

let cachedTiers: HelixTier[] | null = null;

export async function loadHelixTiers(client: PricingSupabaseClient): Promise<HelixTier[]> {
  if (cachedTiers) return cachedTiers;
  const { data, error } = await client.from('helix_tiers').select('*').order('min_engagement_points', { ascending: true });
  if (error) throw new Error(`Failed to load helix_tiers: ${error.message}`);
  cachedTiers = (data ?? []) as HelixTier[];
  return cachedTiers;
}

export function clearHelixTiersCache(): void {
  cachedTiers = null;
}

export async function determineHelixTier(
  client: PricingSupabaseClient,
  userId: string,
  pricingContext: Pick<UserPricingContext, 'currentTier' | 'tierLevel'>,
): Promise<TierResolution> {
  const tiers = await loadHelixTiers(client);
  const { data } = await client
    .from('helix_balances')
    .select('lifetime_earned')
    .eq('user_id', userId)
    .maybeSingle();
  const lifetime = (data as { lifetime_earned: number | null } | null)?.lifetime_earned ?? 0;
  return computeHelixTier(pricingContext, lifetime, tiers);
}

export async function getDetailedTierInfo(
  client: PricingSupabaseClient,
  userId: string,
  pricingContext: Pick<UserPricingContext, 'currentTier' | 'tierLevel'>,
): Promise<HelixTierInfo | null> {
  const tiers = await loadHelixTiers(client);
  const { data } = await client
    .from('helix_balances')
    .select('lifetime_earned')
    .eq('user_id', userId)
    .maybeSingle();
  const lifetime = (data as { lifetime_earned: number | null } | null)?.lifetime_earned ?? 0;
  return computeTierInfo(pricingContext, lifetime, tiers);
}
