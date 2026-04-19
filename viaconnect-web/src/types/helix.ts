// Prompt #92 Phase 2: Helix domain types.
// Derives Row types from the regenerated Database type and layers on
// computed types for the earning engine + engagement score.

import type { Database } from '@/lib/supabase/types';
import type { TierId } from '@/types/pricing';

// ---------- Row aliases -----------------------------------------------------
export type HelixTier = Database['public']['Tables']['helix_tiers']['Row'];
export type HelixBalance = Database['public']['Tables']['helix_balances']['Row'];
export type HelixTransaction = Database['public']['Tables']['helix_transactions']['Row'];
export type HelixRedemption = Database['public']['Tables']['helix_redemptions']['Row'];
export type HelixReferral = Database['public']['Tables']['helix_referrals']['Row'];
export type HelixEarningEventType = Database['public']['Tables']['helix_earning_event_types']['Row'];
export type HelixFamilyPoolConfig = Database['public']['Tables']['helix_family_pool_config']['Row'];
export type EngagementScoreSnapshot = Database['public']['Tables']['engagement_score_snapshots']['Row'];

// ---------- Domain enums ----------------------------------------------------
export type HelixTierId = 'bronze' | 'silver' | 'gold' | 'platinum';
export type PoolType = 'individual' | 'shared_family';
export type FrequencyLimit = 'unlimited' | 'once_per_day' | 'once_per_week' | 'once_per_month' | 'once_per_lifetime';
export type EarningCategory = 'purchase' | 'assessment' | 'tracking' | 'engagement' | 'referral' | 'milestone' | 'community';

// ---------- Computed types --------------------------------------------------
export interface EarningRequest {
  userId: string;
  eventTypeId: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  /** Overrides the event type's base_points (used for per-dollar purchase events). */
  customBasePoints?: number;
}

export interface EarningResult {
  success: boolean;
  pointsEarned?: number;
  basePoints?: number;
  multiplierApplied?: number;
  creditedToUserId?: string;
  creditedToPool?: PoolType;
  helixTierAtTime?: HelixTierId;
  transactionId?: string;
  skippedReason?: string;
}

export interface HelixTierInfo {
  tierId: HelixTierId;
  tierLabel: string;
  earningMultiplier: number;
  currentLifetimePoints: number;
  nextTierId: HelixTierId | null;
  nextTierPoints: number | null;
  progressPercent: number;
  iconName: string;
  description: string;
}

export interface PoolRouting {
  targetUserId: string;
  poolType: PoolType;
  primaryUserId: string | null;
}

/** Consumer membership tier to Helix-tier default mapping. Free users have no
 *  Helix tier; Platinum and Platinum+ Family always sit at 'platinum'. */
export function defaultHelixTierForMembership(tierId: TierId): HelixTierId | null {
  if (tierId === 'free') return null;
  if (tierId === 'gold') return 'bronze';
  return 'platinum';
}
