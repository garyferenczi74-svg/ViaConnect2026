import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export function HelixRedeem() {
  return (
    <View>
      <Animated.View entering={FadeInUp.duration(400)}>
        <Text className="text-xl font-extrabold text-copper mb-1">Spend Your Helix</Text>
        <Text className="text-[13px] text-white/35 mb-4">
          Redeem your earned Helix for premium rewards, products, and experiences
        </Text>
      </Animated.View>
      <Text className="text-[13px] text-white/45">
        Not enough data. Rewards appear from the live catalog and a real Helix balance.
      </Text>
    </View>
  );
}
