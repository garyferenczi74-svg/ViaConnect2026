import React, { useState, useEffect, useCallback } from 'react';
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
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  PRICING,
  type SubscriptionTier,
} from '../../services/purchases';
import { useEntitlements } from '../../hooks/useEntitlements';

export interface PaywallScreenProps {
  onClose?: () => void;
  onPurchaseComplete?: (tier: SubscriptionTier) => void;
}

// ── Tier card data ───────────────────────────────────────────────────────
interface TierCard {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  color: string;
  borderColor: string;
  features: string[];
  popular?: boolean;
}

const TIERS: TierCard[] = [
  {
    id: 'gold',
    name: 'Gold',
    tagline: 'Personal Wellness',
    monthlyPrice: PRICING.gold.monthly,
    annualPrice: PRICING.gold.annual,
    color: '#B75F19',
    borderColor: '#B75F19',
    features: [
      'Full genetic panel view (all 6 panels)',
      'Supplement adherence tracker',
      'ViaTokens rewards (1x earn rate)',
      'Personalized product recommendations',
      'Daily wellness check-ins',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tagline: 'Advanced Insights',
    monthlyPrice: PRICING.platinum.monthly,
    annualPrice: PRICING.platinum.annual,
    color: '#6D597A',
    borderColor: '#6D597A',
    popular: true,
    features: [
      'Everything in Gold, plus:',
      'AI Consensus Advisor (3-model)',
      'Drug-supplement interaction checker',
      'Full wellness analytics dashboard',
      'ViaTokens 2x earn rate',
      'Secure messaging',
      'Data export (HIPAA-compliant)',
    ],
  },
  {
    id: 'practitioner',
    name: 'Practitioner',
    tagline: 'Practice Management',
    monthlyPrice: PRICING.practitioner.monthly,
    annualPrice: PRICING.practitioner.annual,
    color: '#4ADE80',
    borderColor: '#4ADE80',
    features: [
      'Everything in Platinum, plus:',
      'Patient management portal',
      'Protocol builder with 56-SKU catalog',
      'Practice analytics & revenue tracking',
      'Multi-patient genomic comparison',
      'Custom protocol templates',
      'Priority support',
    ],
  },
];

export function PaywallScreen({ onClose, onPurchaseComplete }: PaywallScreenProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const { tier: currentTier, refresh } = useEntitlements();

  // Load offerings from RevenueCat
  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setLoading(true);
    const offerings = await getOfferings();
    if (offerings?.current?.availablePackages) {
      setPackages(offerings.current.availablePackages);
    }
    setLoading(false);
  };

  const handlePurchase = useCallback(
    async (tierId: SubscriptionTier) => {
      setPurchasing(tierId);

      // Find matching package from RevenueCat
      const suffix = isAnnual ? 'annual' : 'monthly';
      const targetId = `viaconnect_${tierId}_${suffix}`;
      const pkg = packages.find(
        (p) =>
          p.product.identifier === targetId ||
          p.identifier === `$rc_${suffix}`,
      );

      if (!pkg && Platform.OS !== 'web') {
        // Fallback: if no RevenueCat package found, try first matching
        const fallbackPkg = packages[0];
        if (!fallbackPkg) {
          Alert.alert(
            'Not Available',
            'This subscription is not yet available for purchase. Please try again later.',
          );
          setPurchasing(null);
          return;
        }
      }

      if (pkg) {
        const result = await purchasePackage(pkg);
        if (result.success) {
          await refresh();
          onPurchaseComplete?.(tierId);
        } else if (result.error && result.error !== 'Purchase cancelled') {
          Alert.alert('Purchase Error', result.error);
        }
      } else {
        // Web or no package available — show info
        Alert.alert(
          'Subscribe',
          `To subscribe to ${tierId} ($${isAnnual ? TIERS.find((t) => t.id === tierId)?.annualPrice : TIERS.find((t) => t.id === tierId)?.monthlyPrice}/${isAnnual ? 'year' : 'month'}), please use the iOS or Android app.`,
        );
      }

      setPurchasing(null);
    },
    [packages, isAnnual, refresh, onPurchaseComplete],
  );

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    const result = await restorePurchases();
    if (result.success) {
      await refresh();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } else {
      Alert.alert('Restore Failed', result.error ?? 'Could not restore purchases.');
    }
    setRestoring(false);
  }, [refresh]);

  if (loading) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator size="large" color="#B75F19" />
        <Text className="text-gray-400 mt-4">Loading plans...</Text>
      </View>
    );
  }

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
          <Text className={`font-semibold ${!isAnnual ? 'text-white' : 'text-gray-400'}`}>
            Monthly
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2.5 rounded-lg items-center ${isAnnual ? 'bg-teal' : ''}`}
          onPress={() => setIsAnnual(true)}
        >
          <Text className={`font-semibold ${isAnnual ? 'text-white' : 'text-gray-400'}`}>
            Annual
          </Text>
          <Text className={`text-xs ${isAnnual ? 'text-teal-light' : 'text-gray-500'}`}>
            2 months free
          </Text>
        </Pressable>
      </View>

      {/* Tier Cards */}
      {TIERS.map((tier) => {
        const isCurrentTier = currentTier === tier.id;
        const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
        const period = isAnnual ? '/year' : '/month';

        return (
          <View
            key={tier.id}
            className="mb-4 rounded-2xl border overflow-hidden"
            style={{ borderColor: tier.borderColor, borderWidth: isCurrentTier ? 2 : 1 }}
          >
            {/* Popular badge */}
            {tier.popular && (
              <View
                className="py-1.5 items-center"
                style={{ backgroundColor: tier.color }}
              >
                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </Text>
              </View>
            )}

            <View className="bg-dark-card p-5">
              {/* Tier name + price */}
              <View className="flex-row items-end justify-between mb-1">
                <View>
                  <Text className="text-white text-xl font-bold">{tier.name}</Text>
                  <Text className="text-gray-400 text-xs">{tier.tagline}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-white text-2xl font-bold">
                    ${price.toFixed(2)}
                  </Text>
                  <Text className="text-gray-500 text-xs">{period}</Text>
                </View>
              </View>

              {isAnnual && (
                <Text className="text-green-400 text-xs mb-3">
                  Save ${((tier.monthlyPrice * 12) - tier.annualPrice).toFixed(2)}/year
                </Text>
              )}

              {/* Features */}
              <View className="mt-3 mb-4 gap-2">
                {tier.features.map((feature, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text style={{ color: tier.color }} className="text-sm mt-0.5">
                      {feature.startsWith('Everything') ? '★' : '✓'}
                    </Text>
                    <Text className="text-gray-300 text-sm flex-1">{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Purchase button */}
              {isCurrentTier ? (
                <View className="rounded-xl py-3.5 items-center border border-dark-border">
                  <Text className="text-gray-400 font-semibold">Current Plan</Text>
                </View>
              ) : (
                <Pressable
                  className="rounded-xl py-3.5 items-center active:opacity-80"
                  style={{ backgroundColor: tier.color }}
                  onPress={() => handlePurchase(tier.id)}
                  disabled={purchasing !== null}
                >
                  {purchasing === tier.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      {currentTier !== 'free' ? 'Switch Plan' : 'Subscribe'}
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
          <Text className="text-white font-semibold">Free tier</Text> includes:
          Clinical Assessment Quiz, 3 genetic variant preview, and product catalog browsing.
        </Text>
      </View>

      {/* Restore Purchases (Apple requirement) */}
      <Pressable
        className="items-center py-3 active:opacity-60"
        onPress={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color="#76866F" size="small" />
        ) : (
          <Text className="text-sage text-sm underline">Restore Purchases</Text>
        )}
      </Pressable>

      {/* Legal links (Apple requirement) */}
      <View className="flex-row justify-center gap-4 mt-3 mb-4">
        <Pressable onPress={() => Linking.openURL('https://farmceutica.com/terms')}>
          <Text className="text-gray-500 text-xs underline">Terms of Service</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL('https://farmceutica.com/privacy')}>
          <Text className="text-gray-500 text-xs underline">Privacy Policy</Text>
        </Pressable>
      </View>

      {/* Close button */}
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
