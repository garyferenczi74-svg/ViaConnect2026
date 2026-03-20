import { View, Text, ScrollView, Pressable } from 'react-native';
import { useAuthStore } from '../../src/lib/auth/store';

export default function ConsumerDashboard() {
  const { profile } = useAuthStore();

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="px-4 py-6">
      {/* Welcome Header */}
      <View className="mb-6">
        <Text className="text-white text-2xl font-bold">
          Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </Text>
        <Text className="text-sage text-sm mt-1">
          One Genome. One Formulation. One Life at a Time.
        </Text>
      </View>

      {/* Vitality Score Card */}
      <View className="bg-dark-card rounded-2xl p-5 border border-dark-border mb-4">
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
      </View>

      {/* Quick Actions */}
      <Text className="text-white text-lg font-semibold mb-3">Quick Actions</Text>
      <View className="gap-3 mb-6">
        <Pressable className="bg-teal rounded-xl p-4 active:opacity-80">
          <Text className="text-white font-semibold">Register GENEX360 Kit</Text>
          <Text className="text-teal-light text-xs mt-0.5">Scan your test kit barcode</Text>
        </Pressable>

        <Pressable className="bg-dark-card border border-dark-border rounded-xl p-4 active:opacity-80">
          <Text className="text-white font-semibold">Browse Supplements</Text>
          <Text className="text-gray-400 text-xs mt-0.5">27 precision formulations</Text>
        </Pressable>

        <Pressable className="bg-dark-card border border-dark-border rounded-xl p-4 active:opacity-80">
          <Text className="text-white font-semibold">Upload Lab Results</Text>
          <Text className="text-gray-400 text-xs mt-0.5">AI-powered analysis</Text>
        </Pressable>
      </View>

      <Text className="text-dark-border text-xs text-center mt-4">
        FarmCeutica Wellness LLC — Buffalo, NY
      </Text>
    </ScrollView>
  );
}
