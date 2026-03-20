import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../lib/auth/store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

// ── GENEX360 Test Kit Products (physical products → Stripe, not store IAP) ──
export const GENEX_KITS = {
  'GENEX-M': { name: 'GENEX-M (Methylation)', price: 288.88, panel: 'methylation' },
  'GENEX-D': { name: 'GENEX-D (Detox)', price: 388.88, panel: 'detox' },
  'GENEX-N': { name: 'GENEX-N (Neuro)', price: 388.88, panel: 'neuro' },
  'GENEX-H': { name: 'GENEX-H (Hormone)', price: 488.88, panel: 'hormone' },
  'GENEX-P': { name: 'GENEX-P (PeptideIQ)', price: 588.88, panel: 'peptide' },
  'GENEX-Complete': { name: 'GENEX360 Complete (6-Panel)', price: 988.88, panel: 'complete' },
} as const;

export type GenexKitId = keyof typeof GENEX_KITS;

interface CheckoutResult {
  success: boolean;
  sessionUrl?: string;
  error?: string;
}

/**
 * Create a Stripe Checkout session for a physical GENEX360 test kit.
 * Physical products are NOT digital goods — they bypass store commission.
 * Opens the Stripe-hosted checkout in an in-app browser.
 */
export async function purchaseGenexKit(kitId: GenexKitId): Promise<CheckoutResult> {
  const userId = useAuthStore.getState().user?.id;
  const session = useAuthStore.getState().session;
  if (!userId || !session) {
    return { success: false, error: 'Not authenticated' };
  }

  const kit = GENEX_KITS[kitId];
  const returnUrl = Linking.createURL('/checkout-complete');

  try {
    // Call Supabase Edge Function to create Stripe Checkout session
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
      body: {
        kitId,
        kitName: kit.name,
        price: kit.price,
        panel: kit.panel,
        returnUrl,
        cancelUrl: Linking.createURL('/checkout-cancel'),
      },
    });

    if (error || !data?.sessionUrl) {
      return { success: false, error: error?.message ?? 'Failed to create checkout session' };
    }

    // Open Stripe Checkout in in-app browser
    if (Platform.OS === 'web') {
      window.location.href = data.sessionUrl;
    } else {
      const result = await WebBrowser.openBrowserAsync(data.sessionUrl, {
        dismissButtonStyle: 'cancel',
        readerMode: false,
        enableBarCollapsing: true,
      });

      if (result.type === 'cancel') {
        return { success: false, error: 'Checkout cancelled' };
      }
    }

    return { success: true, sessionUrl: data.sessionUrl };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Checkout failed',
    };
  }
}

/**
 * Verify a completed checkout session and register the kit.
 * Called when the user returns from Stripe via deep link.
 */
export async function verifyCheckoutSession(
  sessionId: string,
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'stripe-verify-checkout',
      { body: { sessionId } },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, orderId: data?.orderId };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Verification failed',
    };
  }
}
