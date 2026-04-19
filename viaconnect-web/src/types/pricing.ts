// Prompt #90 Phase 1.4: Consumer Pricing domain types
// Derives Row/Insert types from the Supabase Database type and layers
// on the domain enums and computed types used across the pricing engine.

import type { Database } from '@/lib/supabase/types';

// ---------- Row type aliases (from regenerated schema) -----------------------
export type MembershipTier              = Database['public']['Tables']['membership_tiers']['Row'];
export type MembershipRow               = Database['public']['Tables']['memberships']['Row'];
export type FamilyMember                = Database['public']['Tables']['family_members']['Row'];
export type GeneX360Product             = Database['public']['Tables']['genex360_products']['Row'];
export type GeneX360Purchase            = Database['public']['Tables']['genex360_purchases']['Row'];
export type SupplementDiscountRule      = Database['public']['Tables']['supplement_discount_rules']['Row'];
export type OutcomeStack                = Database['public']['Tables']['outcome_stacks']['Row'];
export type OutcomeStackComponent       = Database['public']['Tables']['outcome_stack_components']['Row'];
export type FeatureRow                  = Database['public']['Tables']['features']['Row'];

// ---------- Domain enums -----------------------------------------------------
export type TierId         = 'free' | 'gold' | 'platinum' | 'platinum_family';
export type TierLevel      = 0 | 1 | 2 | 3;
export type BillingCycle   = 'monthly' | 'annual' | 'gift';
export type MembershipStatus =
  | 'active' | 'past_due' | 'canceled' | 'paused' | 'trialing'
  | 'gift_pending' | 'gift_active' | 'gift_expired';
export type PaymentMethod = 'stripe' | 'paypal' | 'gift_from_genex360' | 'complimentary';
export type GeneX360ProductId = 'genex_m' | 'genex360_core' | 'genex360_complete';
export type GeneX360Panel =
  | 'genex_m' | 'nutrigen_dx' | 'hormone_iq'
  | 'epigen_hq' | 'peptide_iq' | 'cannabis_iq';
export type Genex360LifecycleStatus =
  | 'purchased' | 'kit_shipped' | 'sample_received'
  | 'processing' | 'results_delivered' | 'results_reviewed';
export type OutcomeCategory =
  | 'sleep' | 'cognitive' | 'longevity' | 'gut_health'
  | 'methylation' | 'performance_male' | 'vitality_female'
  | 'immune' | 'energy' | 'stress' | 'custom';
export type FeatureCategory =
  | 'assessment' | 'ai_coaching' | 'tracking' | 'integration'
  | 'personalization' | 'family' | 'practitioner' | 'rewards'
  | 'analytics' | 'support' | 'commerce';
export type GateBehavior = 'hide' | 'preview' | 'upgrade_prompt' | 'read_only';
export type DiscountRuleId =
  | 'subscription_base' | 'genex360_member'
  | 'full_precision' | 'annual_prepay_bonus';

// ---------- Computed business-logic types -----------------------------------
export interface UserPricingContext {
  userId: string;
  currentTier: TierId;
  tierLevel: TierLevel;
  hasActiveMembership: boolean;
  hasActiveSubscription: boolean;
  isAnnualPrepay: boolean;
  ownsAnyGeneX360: boolean;
  ownsGeneX360Complete: boolean;
  hasActiveProtocol: boolean;
  activeFamilyMemberCount: {
    adults: number;
    children: number;
  };
  giftMemberships: Array<{
    tierId: TierId;
    endsAt: Date;
    source: 'genex360';
  }>;
}

export interface DiscountCalculationResult {
  originalPriceCents: number;
  appliedDiscountPercent: number;
  appliedRuleId: DiscountRuleId | null;
  annualPrepayBonusApplied: boolean;
  finalPriceCents: number;
  savingsCents: number;
  breakdown: {
    baseDiscount: number;
    annualBonus: number;
    totalDiscount: number;
  };
}

export interface FamilyPricingBreakdown {
  basePriceCents: number;
  additionalAdultCount: number;
  additionalAdultCostCents: number;
  additionalChildrenChunks: number;
  additionalChildrenCostCents: number;
  totalMonthlyCents: number;
  totalAnnualCents: number;
  annualSavingsCents: number;
}

// Convenience: maps between tier id and level
export const TIER_LEVEL_BY_ID: Record<TierId, TierLevel> = {
  free: 0,
  gold: 1,
  platinum: 2,
  platinum_family: 3,
};

export const TIER_ID_BY_LEVEL: Record<TierLevel, TierId> = {
  0: 'free',
  1: 'gold',
  2: 'platinum',
  3: 'platinum_family',
};

export function tierIdToLevel(tierId: TierId): TierLevel {
  return TIER_LEVEL_BY_ID[tierId];
}

export function tierLevelToId(level: TierLevel): TierId {
  return TIER_ID_BY_LEVEL[level];
}
