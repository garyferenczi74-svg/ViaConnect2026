import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
  type PurchasesOfferings,
} from 'react-native-purchases';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../lib/auth/store';

// ── RevenueCat API keys (set per platform) ───────────────────────────────
const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '';

// ── Entitlement identifiers (configured in RevenueCat dashboard) ─────────
export const ENTITLEMENTS = {
  GOLD: 'gold',
  PLATINUM: 'platinum',
  PRACTITIONER: 'practitioner',
} as const;

export type EntitlementId = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

export type SubscriptionTier = 'free' | 'gold' | 'platinum' | 'practitioner';

// ── Product identifiers ──────────────────────────────────────────────────
export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'viaconnect_gold_monthly',
  GOLD_ANNUAL: 'viaconnect_gold_annual',
  PLATINUM_MONTHLY: 'viaconnect_platinum_monthly',
  PLATINUM_ANNUAL: 'viaconnect_platinum_annual',
  PRACTITIONER_MONTHLY: 'viaconnect_practitioner_monthly',
  PRACTITIONER_ANNUAL: 'viaconnect_practitioner_annual',
} as const;

// ── Pricing ──────────────────────────────────────────────────────────────
export const PRICING = {
  gold: { monthly: 8.88, annual: 88.80 },       // annual = 10 months (2 free)
  platinum: { monthly: 28.88, annual: 288.80 },
  practitioner: { monthly: 128.88, annual: 1288.80 },
} as const;

let isInitialized = false;

/**
 * Initialize RevenueCat on app start.
 * Must be called once, before any purchase operations.
 */
export async function initPurchases(): Promise<void> {
  if (isInitialized) return;
  if (Platform.OS === 'web') return; // RevenueCat doesn't run on web

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!apiKey) {
    console.warn('[Purchases] No RevenueCat API key for platform:', Platform.OS);
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    isInitialized = true;

    // Identify user with Supabase user ID
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      await identifyUser(userId);
    }
  } catch (e) {
    console.error('[Purchases] Init failed:', e);
  }
}

/**
 * Identify the RevenueCat user with the Supabase user ID.
 * Call after login / signup.
 */
export async function identifyUser(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !isInitialized) return;

  try {
    const { customerInfo } = await Purchases.logIn(userId);
    await syncEntitlementToSupabase(customerInfo);
  } catch (e) {
    console.error('[Purchases] Identify failed:', e);
  }
}

/**
 * Log out from RevenueCat (call on sign-out).
 */
export async function logOutPurchases(): Promise<void> {
  if (Platform.OS === 'web' || !isInitialized) return;

  try {
    await Purchases.logOut();
  } catch (e) {
    console.error('[Purchases] LogOut failed:', e);
  }
}

/**
 * Fetch available offerings (subscription packages).
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (Platform.OS === 'web' || !isInitialized) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (e) {
    console.error('[Purchases] getOfferings failed:', e);
    return null;
  }
}

/**
 * Purchase a subscription package.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Purchases not available on web' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await syncEntitlementToSupabase(customerInfo);
    return { success: true, customerInfo };
  } catch (e: unknown) {
    const error = e as { userCancelled?: boolean; message?: string };
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }
    return { success: false, error: error.message ?? 'Purchase failed' };
  }
}

/**
 * Restore purchases (Apple requirement).
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Purchases not available on web' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    await syncEntitlementToSupabase(customerInfo);
    return { success: true, customerInfo };
  } catch (e: unknown) {
    const error = e as { message?: string };
    return { success: false, error: error.message ?? 'Restore failed' };
  }
}

/**
 * Get current customer info.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web' || !isInitialized) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/**
 * Set up listener for subscription changes.
 * Returns unsubscribe function.
 */
export function onCustomerInfoUpdated(
  callback: (info: CustomerInfo) => void,
): () => void {
  if (Platform.OS === 'web' || !isInitialized) return () => {};

  Purchases.addCustomerInfoUpdateListener(callback);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}

/**
 * Determine the active tier from customer info.
 */
export function getTierFromCustomerInfo(
  customerInfo: CustomerInfo | null,
): SubscriptionTier {
  if (!customerInfo) return 'free';

  const entitlements = customerInfo.entitlements.active;

  // Check highest tier first
  if (ENTITLEMENTS.PRACTITIONER in entitlements) return 'practitioner';
  if (ENTITLEMENTS.PLATINUM in entitlements) return 'platinum';
  if (ENTITLEMENTS.GOLD in entitlements) return 'gold';

  return 'free';
}

/**
 * Sync RevenueCat entitlement status to Supabase subscriptions table.
 */
async function syncEntitlementToSupabase(
  customerInfo: CustomerInfo,
): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const tier = getTierFromCustomerInfo(customerInfo);
  const activeEntitlement =
    customerInfo.entitlements.active[ENTITLEMENTS.PRACTITIONER] ??
    customerInfo.entitlements.active[ENTITLEMENTS.PLATINUM] ??
    customerInfo.entitlements.active[ENTITLEMENTS.GOLD];

  try {
    // Update memberships table
    await supabase.from('memberships').upsert(
      {
        user_id: userId,
        tier: tier === 'free' ? 'free' : tier,
        rc_entitlement_id: activeEntitlement?.identifier ?? null,
        started_at: activeEntitlement?.latestPurchaseDate ?? new Date().toISOString(),
        expires_at: activeEntitlement?.expirationDate ?? null,
        status: tier === 'free' ? 'expired' : 'active',
      },
      { onConflict: 'user_id' },
    );

    // Update subscriptions table if subscription exists
    if (activeEntitlement) {
      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          plan_id: tier,
          status: activeEntitlement.isActive ? 'active' : 'canceled',
          current_period_start: activeEntitlement.latestPurchaseDate ?? null,
          current_period_end: activeEntitlement.expirationDate ?? null,
        },
        { onConflict: 'user_id' },
      );
    }
  } catch (e) {
    console.error('[Purchases] Sync to Supabase failed:', e);
  }
}
