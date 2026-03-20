import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription, type SubscriptionTier } from '../../hooks/useSubscription';
import { syncSubscriptionToSupabase } from '../../services/syncSubscription';

export interface PaywallScreenProps {
  onClose?: () => void;
  onPurchaseComplete?: (tier: SubscriptionTier) => void;
}

// ── Try native RevenueCat paywall first, fall back to custom ─────────────
let RevenueCatUI: { presentPaywallIfNeeded: (opts: { requiredEntitlementIdentifier: string }) => Promise<unknown> } | null = null;
try {
  // Dynamic require so web builds don't crash
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RevenueCatUI = require('react-native-purchases-ui').default;
  }
} catch {
  RevenueCatUI = null;
}

// ── Tier card definitions ────────────────────────────────────────────────
interface TierCard {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  bgColor: string;
  accentColor: string;
  features: string[];
  popular?: boolean;
}

const TIER_CARDS: TierCard[] = [
  {
    id: 'gold',
    name: 'Gold',
    tagline: '$8.88/month',
    monthlyPrice: 8.88,
    annualPrice: 88.80,
    bgColor: '#224852',
    accentColor: '#B75F19',
    features: [
      'Full GENEX360 genetic panel access',
      'Supplement tracker with reminders',
      'ViaTokens rewards program',
      'Secure messaging with practitioners',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tagline: '$28.88/month',
    monthlyPrice: 28.88,
    annualPrice: 288.80,
    bgColor: '#1a1a2e',
    accentColor: '#B75F19',
    popular: true,
    features: [
      'Everything in Gold',
      'AI Health Advisor (Claude + Grok + GPT consensus)',
      'Drug-supplement interaction checker',
      'Full analytics dashboard',
      '2x ViaToken earning rate',
    ],
  },
  {
    id: 'practitioner',
    name: 'Practitioner',
    tagline: '$128.88/month',
    monthlyPrice: 128.88,
    annualPrice: 1288.80,
    bgColor: '#0a2a1a',
    accentColor: '#4ADE80',
    features: [
      'Everything in Platinum',
      'Patient management portal',
      'Protocol builder with auto-populate',
      'Practice analytics',
      'EHR integration hub',
      'Unlimited patient consents',
    ],
  },
];

export function PaywallScreen({ onClose, onPurchaseComplete }: PaywallScreenProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const {
    tier: currentTier,
    offerings,
    purchase,
    restore,
    refresh,
    customerInfo,
  } = useSubscription();

  // Try RevenueCat native paywall first
  const showNativePaywall = useCallback(async () => {
    if (!RevenueCatUI) return false;
    try {
      await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'viaconnect_pro',
      });
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  // Attempt native paywall on mount for native platforms
  React.useEffect(() => {
    if (Platform.OS !== 'web' && RevenueCatUI) {
      showNativePaywall();
    }
  }, [showNativePaywall]);

  const handlePurchase = useCallback(
    async (tierId: SubscriptionTier) => {
      if (!offerings) {
        Alert.alert(
          'Not Available',
          'Subscription packages are loading. Please try again.',
        );
        return;
      }

      setPurchasing(tierId);

      // Find matching package from current offering
      const suffix = isAnnual ? 'annual' : 'monthly';
      const targetId = `viaconnect_${tierId}_${suffix}`;
      const pkg: PurchasesPackage | undefined =
        offerings.availablePackages.find(
          (p) => p.product.identifier === targetId,
        ) ??
        offerings.availablePackages.find(
          (p) => p.identifier === `$rc_${suffix}`,
        );

      if (!pkg) {
        Alert.alert(
          'Not Available',
          'This subscription is not yet available for purchase. Please try again later.',
        );
        setPurchasing(null);
        return;
      }

      const success = await purchase(pkg);
      if (success) {
        // Sync to Supabase
        const info = await (await import('../../services/purchases')).getCustomerInfo();
        if (info) await syncSubscriptionToSupabase(info);
        onPurchaseComplete?.(tierId);
      }

      setPurchasing(null);
    },
    [offerings, isAnnual, purchase, onPurchaseComplete],
  );

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    const success = await restore();
    if (success) {
      const info = await (await import('../../services/purchases')).getCustomerInfo();
      if (info) await syncSubscriptionToSupabase(info);
      Alert.alert('Restored', 'Your purchases have been restored.');
    } else {
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    }
    setRestoring(false);
  }, [restore]);

  return (
    <ScrollView
      className="flex-1 bg-dark-bg"
      contentContainerClassName="px-4 pt-6 pb-12"
    >
      {/* Header */}
      <View className="items-center mb-6">
        <Text className="text-white text-2xl font-bold">
          Unlock ViaConnect
        </Text>
        <Text className="text-sage text-sm mt-1 text-center">
          One Genome. One Formulation. One Life at a Time.
        </Text>
      </View>

      {/* Monthly / Annual Toggle */}
      <View className="flex-row bg-dark-card rounded-xl p-1 mb-6 border border-dark-border">
        <Pressable
          className={`flex-1 py-2.5 rounded-lg items-center ${!isAnnual ? 'bg-teal' : ''}`}
          onPress={() => setIsAnnual(false)}
        >
          <Text
            className={`font-semibold ${!isAnnual ? 'text-white' : 'text-gray-400'}`}
          >
            Monthly
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2.5 rounded-lg items-center ${isAnnual ? 'bg-teal' : ''}`}
          onPress={() => setIsAnnual(true)}
        >
          <Text
            className={`font-semibold ${isAnnual ? 'text-white' : 'text-gray-400'}`}
          >
            Annual
          </Text>
          <Text
            className={`text-xs ${isAnnual ? 'text-teal-light' : 'text-gray-500'}`}
          >
            2 months free
          </Text>
        </Pressable>
      </View>

      {/* Tier Cards */}
      {TIER_CARDS.map((card) => {
        const isCurrentTier = currentTier === card.id;
        const price = isAnnual ? card.annualPrice : card.monthlyPrice;
        const period = isAnnual ? '/year' : '/month';

        return (
          <View
            key={card.id}
            className="mb-4 rounded-2xl overflow-hidden border"
            style={{
              borderColor: card.accentColor,
              borderWidth: card.popular ? 2 : 1,
            }}
          >
            {/* Popular badge */}
            {card.popular && (
              <View
                className="py-1.5 items-center"
                style={{ backgroundColor: card.accentColor }}
              >
                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </Text>
              </View>
            )}

            <View
              className="p-5"
              style={{ backgroundColor: card.bgColor }}
            >
              {/* Name + Price */}
              <View className="flex-row items-end justify-between mb-1">
                <View>
                  <Text className="text-white text-xl font-bold">
                    {card.name}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-white text-2xl font-bold">
                    ${price.toFixed(2)}
                  </Text>
                  <Text className="text-gray-400 text-xs">{period}</Text>
                </View>
              </View>

              {isAnnual && (
                <Text className="text-green-400 text-xs mb-3">
                  Save $
                  {(card.monthlyPrice * 12 - card.annualPrice).toFixed(2)}
                  /year
                </Text>
              )}

              {/* Features */}
              <View className="mt-3 mb-4 gap-2">
                {card.features.map((feature, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text
                      className="text-sm mt-0.5"
                      style={{ color: card.accentColor }}
                    >
                      {feature.startsWith('Everything') ? '★' : '✓'}
                    </Text>
                    <Text className="text-gray-300 text-sm flex-1">
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Purchase button */}
              {isCurrentTier ? (
                <View className="rounded-xl py-3.5 items-center border border-dark-border">
                  <Text className="text-gray-400 font-semibold">
                    Current Plan
                  </Text>
                </View>
              ) : (
                <Pressable
                  className="rounded-xl py-3.5 items-center active:opacity-80"
                  style={{ backgroundColor: card.accentColor }}
                  onPress={() => handlePurchase(card.id)}
                  disabled={purchasing !== null}
                >
                  {purchasing === card.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      Subscribe
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      {/* Free tier reminder */}
      <View className="bg-dark-card rounded-2xl p-4 border border-dark-border mb-6">
        <Text className="text-gray-400 text-sm text-center">
          <Text className="text-white font-semibold">Free tier</Text>{' '}
          includes: Clinical Assessment Quiz, 3 genetic variant preview,
          and product catalog browsing.
        </Text>
      </View>

      {/* Restore Purchases — Apple requirement */}
      <Pressable
        className="items-center py-3 active:opacity-60"
        onPress={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color="#76866F" size="small" />
        ) : (
          <Text className="text-sage text-sm underline">
            Restore Purchases
          </Text>
        )}
      </Pressable>

      {/* Terms + Privacy — Apple requirement */}
      <View className="flex-row justify-center gap-4 mt-3 mb-4">
        <Pressable
          onPress={() =>
            Linking.openURL('https://viaconnectapp.com/terms')
          }
        >
          <Text className="text-gray-500 text-xs underline">
            Terms of Service
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Linking.openURL('https://viaconnectapp.com/privacy')
          }
        >
          <Text className="text-gray-500 text-xs underline">
            Privacy Policy
          </Text>
        </Pressable>
      </View>

      {/* Close */}
      {onClose && (
        <Pressable
          className="items-center py-4 active:opacity-60"
          onPress={onClose}
        >
          <Text className="text-gray-500 text-sm">Maybe Later</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
