import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  getCustomerInfo,
  getTierFromCustomerInfo,
  onCustomerInfoUpdated,
  type SubscriptionTier,
} from '../services/purchases';
import { useAuthStore } from '../lib/auth/store';
import { supabase } from '../lib/supabase/client';

export interface EntitlementState {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook returning the user's current subscription tier and entitlement status.
 * Listens for real-time changes from RevenueCat on native platforms.
 * Falls back to Supabase membership data on web.
 */
export function useEntitlements(): EntitlementState {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userId = useAuthStore((s) => s.user?.id);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTier('free');
      setExpiresAt(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (Platform.OS !== 'web') {
      // Native: get from RevenueCat
      try {
        const info = await getCustomerInfo();
        const currentTier = getTierFromCustomerInfo(info);
        setTier(currentTier);

        const activeEntitlement = info?.entitlements.active
          ? Object.values(info.entitlements.active)[0]
          : null;
        setExpiresAt(activeEntitlement?.expirationDate ?? null);
      } catch {
        // Fall back to Supabase
        await fetchFromSupabase();
      }
    } else {
      // Web: always use Supabase
      await fetchFromSupabase();
    }

    setIsLoading(false);
  }, [userId]);

  const fetchFromSupabase = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('memberships')
      .select('tier, expires_at, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (data) {
      setTier(data.tier as SubscriptionTier);
      setExpiresAt(data.expires_at);
    } else {
      setTier('free');
      setExpiresAt(null);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for RevenueCat updates on native
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const unsub = onCustomerInfoUpdated((info) => {
      const newTier = getTierFromCustomerInfo(info);
      setTier(newTier);

      const activeEntitlement = Object.values(info.entitlements.active)[0];
      setExpiresAt(activeEntitlement?.expirationDate ?? null);
    });

    return unsub;
  }, []);

  return {
    tier,
    isActive: tier !== 'free',
    expiresAt,
    isLoading,
    refresh,
  };
}
