import { useState, useEffect, useCallback } from 'react';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  type PurchasesOffering,
} from 'react-native-purchases';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  hasEntitlement,
} from '../services/purchases';

// ViaConnect entitlement IDs (must match RevenueCat dashboard config)
export const ENTITLEMENTS = {
  GOLD: 'viaconnect_gold',
  PLATINUM: 'viaconnect_platinum',
  PRACTITIONER: 'viaconnect_practitioner',
  PRO: 'viaconnect_pro', // Legacy/unified pro entitlement
} as const;

export type SubscriptionTier = 'free' | 'gold' | 'platinum' | 'practitioner';

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  isSubscribed: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine current tier from entitlements
  const getTier = useCallback(
    (info: CustomerInfo | null): SubscriptionTier => {
      if (!info) return 'free';
      if (hasEntitlement(info, ENTITLEMENTS.PRACTITIONER)) return 'practitioner';
      if (hasEntitlement(info, ENTITLEMENTS.PLATINUM)) return 'platinum';
      if (hasEntitlement(info, ENTITLEMENTS.GOLD)) return 'gold';
      if (hasEntitlement(info, ENTITLEMENTS.PRO)) return 'platinum'; // PRO → platinum
      return 'free';
    },
    [],
  );

  const tier = getTier(customerInfo);
  const isSubscribed = tier !== 'free';

  // Load customer info and offerings on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [info, offer] = await Promise.all([
          getCustomerInfo(),
          getOfferings(),
        ]);
        setCustomerInfo(info);
        setOfferings(offer);
      } catch (error) {
        console.error('Subscription load error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();

    // Listen for real-time subscription changes
    Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
    });
  }, []);

  // Purchase handler
  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      const info = await purchasePackage(pkg);
      if (info) {
        setCustomerInfo(info);
        return true;
      }
      return false;
    },
    [],
  );

  // Restore handler
  const restore = useCallback(async (): Promise<boolean> => {
    const info = await restorePurchases();
    if (info) {
      setCustomerInfo(info);
      return true;
    }
    return false;
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    const info = await getCustomerInfo();
    if (info) setCustomerInfo(info);
  }, []);

  return {
    tier,
    isSubscribed,
    isLoading,
    customerInfo,
    offerings,
    purchase,
    restore,
    refresh,
  };
}
