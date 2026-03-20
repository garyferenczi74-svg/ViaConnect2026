import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { PaywallScreen } from './PaywallScreen';
import type { SubscriptionTier } from '../../hooks/useSubscription';

export interface LockedFeatureOverlayProps {
  /** The minimum tier required to unlock this feature */
  requiredTier: SubscriptionTier;
  /** Human-readable feature name */
  featureName: string;
  /** Description of what's locked */
  description?: string;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  gold: 'Gold ($8.88/mo)',
  platinum: 'Platinum ($28.88/mo)',
  practitioner: 'Practitioner ($128.88/mo)',
};

/**
 * Full-screen overlay shown when a user tries to access a gated feature.
 * Includes upgrade CTA that opens the PaywallScreen.
 */
export function LockedFeatureOverlay({
  requiredTier,
  featureName,
  description,
}: LockedFeatureOverlayProps) {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <View className="flex-1 bg-dark-bg items-center justify-center px-6">
      {/* Lock icon */}
      <View className="w-20 h-20 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-6">
        <Text className="text-4xl">🔒</Text>
      </View>

      <Text className="text-white text-xl font-bold text-center mb-2">
        {featureName}
      </Text>
      <Text className="text-gray-400 text-sm text-center mb-1">
        {description ?? `This feature requires a ${TIER_LABELS[requiredTier]} subscription.`}
      </Text>
      <Text className="text-copper text-xs text-center mb-8">
        Upgrade to {TIER_LABELS[requiredTier]} to unlock
      </Text>

      <Pressable
        className="bg-copper rounded-xl px-8 py-4 active:opacity-80"
        onPress={() => setShowPaywall(true)}
      >
        <Text className="text-white font-bold text-base">
          View Plans
        </Text>
      </Pressable>

      <Modal visible={showPaywall} animationType="slide">
        <PaywallScreen
          onClose={() => setShowPaywall(false)}
          onPurchaseComplete={() => setShowPaywall(false)}
        />
      </Modal>
    </View>
  );
}
