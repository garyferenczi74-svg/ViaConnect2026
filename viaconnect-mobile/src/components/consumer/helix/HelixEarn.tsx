import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BarChart3 } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';

export function HelixEarn() {
  return (
    <View>
      <Animated.View entering={FadeInUp.duration(400)}>
        <Text className="text-xl font-extrabold text-copper mb-1">Ways to Earn Helix</Text>
        <Text className="text-[13px] text-white/35 mb-4">
          Every healthy action earns redeemable Helix credits
        </Text>
      </Animated.View>
      <Text className="text-[13px] text-white/45 mb-4">
        Not enough data. Ways to earn appear from helix_earning_event_types.
      </Text>

      <GlassCard className="p-5 mt-3">
        <View className="flex-row items-center mb-3">
          <BarChart3 size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">
            Today&apos;s Helix Activity
          </Text>
        </View>
        <Text className="text-[13px] text-white/45">Not enough data</Text>
      </GlassCard>
    </View>
  );
}
