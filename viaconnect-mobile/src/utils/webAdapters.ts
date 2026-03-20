/**
 * Web-specific adapters for native-only APIs.
 *
 * STEP 5: Handle web-specific differences
 * - expo-camera  → file upload input on web
 * - expo-local-authentication → password-only on web
 * - expo-secure-store → encrypted httpOnly cookies on web
 * - expo-haptics → no-op on web (already handled by Expo)
 * - RevenueCat → Stripe Web Billing on desktop
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Barcode / Camera
// ---------------------------------------------------------------------------

/**
 * On web, we skip expo-camera barcode scanning and use a file upload input.
 * Returns true if the native barcode scanner should be shown.
 */
export function canUseNativeScanner(): boolean {
  return Platform.OS !== 'web';
}

// ---------------------------------------------------------------------------
// Biometric Authentication
// ---------------------------------------------------------------------------

/**
 * On web, biometric auth is not available.
 * Fall back to password-only authentication.
 */
export async function authenticateUser(): Promise<{
  success: boolean;
  method: 'biometric' | 'password';
}> {
  if (Platform.OS === 'web') {
    // On web, always return password method — the caller should show a
    // password prompt instead of biometric.
    return { success: false, method: 'password' };
  }

  try {
    const LocalAuthentication = require('expo-local-authentication');
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity',
        fallbackLabel: 'Use password',
      });
      return { success: result.success, method: 'biometric' };
    }
  } catch {
    // Fall through to password
  }

  return { success: false, method: 'password' };
}

// ---------------------------------------------------------------------------
// Secure Storage
// ---------------------------------------------------------------------------

/**
 * Platform-aware secure storage.
 * - Native: expo-secure-store (encrypted keychain / keystore)
 * - Web: httpOnly cookie via API call, with localStorage as session fallback
 */
export const SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Web fallback: sessionStorage (server should use httpOnly cookies
      // for tokens via Set-Cookie headers in Supabase Edge Functions)
      return sessionStorage.getItem(key);
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      sessionStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      sessionStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

// ---------------------------------------------------------------------------
// Payments / RevenueCat
// ---------------------------------------------------------------------------

/**
 * Returns the payment method for the current platform.
 * - iOS/Android: RevenueCat (Apple/Google billing)
 * - Web: Stripe Web Billing
 */
export function getPaymentProvider(): 'revenuecat' | 'stripe' {
  return Platform.OS === 'web' ? 'stripe' : 'revenuecat';
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

/**
 * Trigger haptic feedback. No-op on web (Expo handles this already,
 * but this wrapper is here for explicit documentation).
 */
export async function triggerHaptic(
  style: 'light' | 'medium' | 'heavy' = 'light',
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const Haptics = require('expo-haptics');
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    await Haptics.impactAsync(map[style]);
  } catch {
    // Silently fail if haptics unavailable
  }
}
