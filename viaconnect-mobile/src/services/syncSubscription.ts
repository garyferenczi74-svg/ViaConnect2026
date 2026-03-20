import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../lib/auth/store';
import type { CustomerInfo } from 'react-native-purchases';
import { hasEntitlement } from './purchases';

// Entitlement IDs — keep in sync with useSubscription.ts
const ENTITLEMENTS = {
  GOLD: 'viaconnect_gold',
  PLATINUM: 'viaconnect_platinum',
  PRACTITIONER: 'viaconnect_practitioner',
  PRO: 'viaconnect_pro',
} as const;

type SyncTier = 'free' | 'gold' | 'platinum' | 'practitioner';

function tierFromInfo(info: CustomerInfo): SyncTier {
  if (hasEntitlement(info, ENTITLEMENTS.PRACTITIONER)) return 'practitioner';
  if (hasEntitlement(info, ENTITLEMENTS.PLATINUM)) return 'platinum';
  if (hasEntitlement(info, ENTITLEMENTS.GOLD)) return 'gold';
  if (hasEntitlement(info, ENTITLEMENTS.PRO)) return 'platinum';
  return 'free';
}

/**
 * Sync RevenueCat subscription state → Supabase.
 * Call on purchase success AND on every customerInfoUpdate listener fire.
 * This allows Edge Functions to check subscription status server-side
 * without calling RevenueCat API on every request.
 */
export async function syncSubscriptionToSupabase(
  customerInfo: CustomerInfo,
): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const tier = tierFromInfo(customerInfo);

  // Pick the highest-priority active entitlement for period dates
  const activeEntitlement =
    customerInfo.entitlements.active[ENTITLEMENTS.PRACTITIONER] ??
    customerInfo.entitlements.active[ENTITLEMENTS.PLATINUM] ??
    customerInfo.entitlements.active[ENTITLEMENTS.GOLD] ??
    customerInfo.entitlements.active[ENTITLEMENTS.PRO];

  try {
    // 1. Upsert memberships (for quick tier checks)
    await supabase.from('memberships').upsert(
      {
        user_id: userId,
        tier: tier === 'free' ? 'free' : tier,
        rc_entitlement_id: activeEntitlement?.identifier ?? null,
        started_at:
          activeEntitlement?.latestPurchaseDate ?? new Date().toISOString(),
        expires_at: activeEntitlement?.expirationDate ?? null,
        status: tier === 'free' ? 'expired' : 'active',
      },
      { onConflict: 'user_id' },
    );

    // 2. Upsert subscriptions (detailed tracking for Stripe + RC)
    await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        plan_id: tier,
        status: activeEntitlement?.isActive ? 'active' : 'canceled',
        current_period_start:
          activeEntitlement?.latestPurchaseDate ?? null,
        current_period_end: activeEntitlement?.expirationDate ?? null,
      },
      { onConflict: 'user_id' },
    );
  } catch (error) {
    console.error('[syncSubscription] Failed:', error);
  }
}
