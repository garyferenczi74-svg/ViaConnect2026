// Prompt #90 Phase 2: Feature gating.
// Pure `evaluateFeatureAccess` + DB-backed wrapper.
//
// Prompt #93 Phase 2.4: `userHasFeatureAccess` added as the single call
// consumers should make. It routes through the flag evaluation engine so
// kill switch, launch phase, and rollout strategy are all honored.
// Existing exports (`evaluateFeatureAccess`, `loadFeatures`, etc.) remain
// for Prompt #90 callers that don't need the full engine.

import type { FeatureRow, GateBehavior, TierId, TierLevel } from '@/types/pricing';
import { tierIdToLevel } from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';
import { evaluateFlagCached } from '@/lib/flags/cache';

export interface FeatureAccessResult {
  hasAccess: boolean;
  gateBehavior: GateBehavior;
  requiredTierLevel: TierLevel;
}

/** Pure: given loaded features + user tier, determine access to a feature. */
export function evaluateFeatureAccess(
  features: FeatureRow[],
  userTierId: TierId,
  featureId: string,
): FeatureAccessResult {
  const feature = features.find((f) => f.id === featureId);
  if (!feature) {
    throw new Error(`Unknown feature: ${featureId}`);
  }
  const userLevel = tierIdToLevel(userTierId);
  const requiredLevel = feature.minimum_tier_level as TierLevel;
  const hasAccess = userLevel >= requiredLevel;
  return {
    hasAccess,
    gateBehavior: feature.gate_behavior as GateBehavior,
    requiredTierLevel: requiredLevel,
  };
}

/** Pure: compute the full list of feature ids accessible at a given tier. */
export function accessibleFeatureIds(
  features: FeatureRow[],
  userTierId: TierId,
): string[] {
  const level = tierIdToLevel(userTierId);
  return features.filter((f) => f.minimum_tier_level <= level).map((f) => f.id);
}

// ----- DB-backed wrapper ----------------------------------------------------

let cachedFeatures: FeatureRow[] | null = null;

export async function loadFeatures(client: PricingSupabaseClient): Promise<FeatureRow[]> {
  if (cachedFeatures) return cachedFeatures;
  const { data, error } = await client.from('features').select('*').eq('is_active', true);
  if (error) throw new Error(`Failed to load features: ${error.message}`);
  cachedFeatures = (data ?? []) as FeatureRow[];
  return cachedFeatures;
}

export function clearFeaturesCache(): void {
  cachedFeatures = null;
}

// ----- Prompt #93: full-engine wrapper --------------------------------------

export interface UserFeatureAccess {
  hasAccess: boolean;
  gateBehavior: GateBehavior;
  requiredTierLevel: TierLevel;
  reason: string;
}

/** Route a feature access check through the full flag evaluation engine.
 *  Respects kill switch, launch phase status, rollout strategy, tier gating,
 *  family-tier and GeneX360 requirements. Anonymous users pass userId=null. */
export async function userHasFeatureAccess(
  userId: string | null,
  featureId: string,
): Promise<UserFeatureAccess> {
  const result = await evaluateFlagCached(userId, featureId);
  return {
    hasAccess: result.enabled,
    gateBehavior: result.gateBehavior,
    requiredTierLevel: (result.metadata?.requiredTier ?? 0) as TierLevel,
    reason: result.reason,
  };
}
