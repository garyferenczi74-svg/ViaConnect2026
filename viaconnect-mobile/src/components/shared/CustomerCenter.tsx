import React from 'react';
import { Pressable, Text, Platform, Alert } from 'react-native';

/**
 * Button that opens RevenueCat's native Customer Center.
 * Users can: view subscription details, cancel, request refund, contact support.
 * Add this to Profile / Settings screens.
 */
export interface CustomerCenterButtonProps {
  /** Button label override */
  label?: string;
  /** Additional NativeWind classes */
  className?: string;
}

export function CustomerCenterButton({
  label = 'Manage Subscription',
  className = '',
}: CustomerCenterButtonProps) {
  const handlePress = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Subscription Management',
        'Please use the iOS or Android app to manage your subscription.',
      );
      return;
    }

    try {
      const RevenueCatUI = require('react-native-purchases-ui').default;
      await RevenueCatUI.presentCustomerCenter();
    } catch (error) {
      console.error('Failed to open Customer Center:', error);
      Alert.alert(
        'Unavailable',
        'Subscription management is not available right now. Please try again later.',
      );
    }
  };

  return (
    <Pressable
      className={`flex-row items-center gap-2 px-4 py-3 rounded-xl bg-dark-card border border-dark-border active:opacity-80 ${className}`}
      onPress={handlePress}
    >
      <Text className="text-white font-semibold">{label}</Text>
      <Text className="text-gray-400 text-xs ml-auto">→</Text>
    </Pressable>
  );
}
