import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../src/lib/auth/store';
import { StaggerItem, AnimatedSection, GlassCard, hapticLight } from '../../src/components/ui';

export default function ConsumerDashboard() {
  const { profile } = useAuthStore();

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="px-4 py-6">
      {/* Welcome Header */}
      <Animated.View entering={FadeIn.duration(300)} className="mb-6">
        <Text className="text-white text-2xl font-bold">
          Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </Text>
        <Text className="text-sage text-sm mt-1">
          One Genome. One Formulation. One Life at a Time.
        </Text>
      </Animated.View>

      {/* Vitality Score Card — glass */}
      <StaggerItem index={0}>
        <GlassCard className="p-5 mb-4">
          <Text className="text-gray-400 text-xs uppercase tracking-wide mb-2">
            Vitality Score
          </Text>
          <View className="flex-row items-end gap-2">
            <Text className="text-copper text-4xl font-bold">--</Text>
            <Text className="text-gray-500 text-sm mb-1">/ 100</Text>
          </View>
          <Text className="text-gray-500 text-xs mt-2">
            Complete your genetic profile to unlock your score
          </Text>
        </GlassCard>
      </StaggerItem>

      {/* Quick Actions */}
      <AnimatedSection delay={200}>
        <Text className="text-white text-lg font-semibold mb-3">Quick Actions</Text>
      </AnimatedSection>
      <View className="gap-3 mb-6">
        <StaggerItem index={0} stagger={100}>
          <Pressable
            className="bg-teal rounded-xl p-4 active:opacity-80"
            onPress={() => hapticLight()}
          >
            <Text className="text-white font-semibold">Register GENEX360 Kit</Text>
            <Text className="text-teal-light text-xs mt-0.5">Scan your test kit barcode</Text>
          </Pressable>
        </StaggerItem>

        <StaggerItem index={1} stagger={100}>
          <Pressable
            className="bg-white/5 border border-white/10 rounded-xl p-4 active:opacity-80"
            onPress={() => hapticLight()}
          >
            <Text className="text-white font-semibold">Browse Supplements</Text>
            <Text className="text-gray-400 text-xs mt-0.5">27 precision formulations</Text>
          </Pressable>
        </StaggerItem>

        <StaggerItem index={2} stagger={100}>
          <Pressable
            className="bg-white/5 border border-white/10 rounded-xl p-4 active:opacity-80"
            onPress={() => hapticLight()}
          >
            <Text className="text-white font-semibold">Upload Lab Results</Text>
            <Text className="text-gray-400 text-xs mt-0.5">AI-powered analysis</Text>
          </Pressable>
        </StaggerItem>
      </View>

      <Text className="text-dark-border text-xs text-center mt-4">
        FarmCeutica Wellness LLC — Buffalo, NY
      </Text>
    </ScrollView>
  );
}
