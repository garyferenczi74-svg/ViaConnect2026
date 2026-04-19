// Prompt #90 Phase 2: Feature gating.
// Pure `evaluateFeatureAccess` + DB-backed wrapper.

import type { FeatureRow, GateBehavior, TierId, TierLevel } from '@/types/pricing';
import { tierIdToLevel } from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';

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
