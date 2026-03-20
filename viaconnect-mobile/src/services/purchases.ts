import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API key (test mode — replace with production key before release)
const API_KEY = 'test_zRQnMNLNcJDozwUFuZpRBzzkiet';

/**
 * Initialize RevenueCat — call this ONCE in app root on mount.
 * Order: 1) configure SDK  2) logIn with Supabase userId
 */
export async function initializePurchases(userId?: string): Promise<void> {
  try {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Purchases.configure({ apiKey: API_KEY });
    }

    // Identify user with Supabase user ID for cross-platform sync
    if (userId) {
      await Purchases.logIn(userId);
    }
  } catch (error) {
    console.error('RevenueCat init failed:', error);
  }
}

/** Fetch available subscription offerings. */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to fetch offerings:', error);
    return null;
  }
}

/** Purchase a specific package. Returns CustomerInfo on success, null on cancel/error. */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: unknown) {
    const err = error as { userCancelled?: boolean };
    if (!err.userCancelled) {
      console.error('Purchase failed:', error);
    }
    return null;
  }
}

/** Restore previous purchases (Apple requires this button). */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Restore failed:', error);
    return null;
  }
}

/** Get current customer info. */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/** Check if user has an active entitlement by ID. */
export function hasEntitlement(
  customerInfo: CustomerInfo,
  entitlementId: string,
): boolean {
  return customerInfo.entitlements.active[entitlementId] !== undefined;
}

/** Logout on sign out. */
export async function logoutPurchases(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
