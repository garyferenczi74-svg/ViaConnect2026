import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export function HelixChallenges() {
  return (
    <View>
      <Animated.View entering={FadeInUp.duration(400)}>
        <Text className="text-xl font-extrabold text-copper mb-1">All Challenges</Text>
        <Text className="text-[13px] text-white/35 mb-4">
          Join challenges, earn bonus Helix, and compete with your squad
        </Text>
      </Animated.View>
      <Text className="text-[13px] text-white/45">
        Challenges appear when one is published.
      </Text>
    </View>
  );
}
