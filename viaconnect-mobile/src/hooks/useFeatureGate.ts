import { useMemo } from 'react';
import { useEntitlements } from './useEntitlements';
import type { SubscriptionTier } from '../services/purchases';

// ── Feature definitions ──────────────────────────────────────────────────
export type Feature =
  | 'caq'
  | 'genetic_preview'           // 3 variants only (free)
  | 'genetic_full'              // All variants
  | 'product_catalog'
  | 'supplement_tracker'
  | 'via_tokens'
  | 'via_tokens_2x'
  | 'ai_advisor'
  | 'interaction_checker'
  | 'full_analytics'
  | 'patient_management'
  | 'protocol_builder'
  | 'practice_analytics'
  | 'export_data'
  | 'secure_messaging';

const TIER_FEATURES: Record<SubscriptionTier, Feature[]> = {
  free: [
    'caq',
    'genetic_preview',
    'product_catalog',
  ],
  gold: [
    'caq',
    'genetic_preview',
    'genetic_full',
    'product_catalog',
    'supplement_tracker',
    'via_tokens',
  ],
  platinum: [
    'caq',
    'genetic_preview',
    'genetic_full',
    'product_catalog',
    'supplement_tracker',
    'via_tokens',
    'via_tokens_2x',
    'ai_advisor',
    'interaction_checker',
    'full_analytics',
    'export_data',
    'secure_messaging',
  ],
  practitioner: [
    'caq',
    'genetic_preview',
    'genetic_full',
    'product_catalog',
    'supplement_tracker',
    'via_tokens',
    'via_tokens_2x',
    'ai_advisor',
    'interaction_checker',
    'full_analytics',
    'patient_management',
    'protocol_builder',
    'practice_analytics',
    'export_data',
    'secure_messaging',
  ],
};

// Maximum genetic variants visible per tier
export const GENETIC_VARIANT_LIMITS: Record<SubscriptionTier, number> = {
  free: 3,
  gold: Infinity,
  platinum: Infinity,
  practitioner: Infinity,
};

// Token earn multiplier per tier
export const TOKEN_MULTIPLIERS: Record<SubscriptionTier, number> = {
  free: 1,
  gold: 1,
  platinum: 2,
  practitioner: 2,
};

interface FeatureGate {
  /** Check if a specific feature is available */
  can: (feature: Feature) => boolean;
  /** Current tier */
  tier: SubscriptionTier;
  /** Whether user has any paid subscription */
  isPaid: boolean;
  /** Max genetic variants visible */
  variantLimit: number;
  /** Token earn multiplier */
  tokenMultiplier: number;
  /** Loading state */
  isLoading: boolean;
  /** The minimum tier needed for a feature (for upgrade prompts) */
  requiredTier: (feature: Feature) => SubscriptionTier;
}

/**
 * Hook for feature gating throughout the app.
 *
 * Usage:
 * ```tsx
 * const { can, requiredTier } = useFeatureGate();
 *
 * if (can('ai_advisor')) {
 *   // Show AI advisor
 * } else {
 *   // Show upgrade prompt for requiredTier('ai_advisor')
 * }
 * ```
 */
export function useFeatureGate(): FeatureGate {
  const { tier, isActive, isLoading } = useEntitlements();

  const allowedFeatures = useMemo(
    () => new Set(TIER_FEATURES[tier]),
    [tier],
  );

  const can = useMemo(
    () => (feature: Feature) => allowedFeatures.has(feature),
    [allowedFeatures],
  );

  const requiredTier = useMemo(
    () => (feature: Feature): SubscriptionTier => {
      const tiers: SubscriptionTier[] = ['free', 'gold', 'platinum', 'practitioner'];
      for (const t of tiers) {
        if (TIER_FEATURES[t].includes(feature)) return t;
      }
      return 'practitioner';
    },
    [],
  );

  return {
    can,
    tier,
    isPaid: isActive,
    variantLimit: GENETIC_VARIANT_LIMITS[tier],
    tokenMultiplier: TOKEN_MULTIPLIERS[tier],
    isLoading,
    requiredTier,
  };
}
