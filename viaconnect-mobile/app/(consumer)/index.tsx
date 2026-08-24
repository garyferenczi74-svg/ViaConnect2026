import { View, Text, ScrollView } from 'react-native';
import { useBreakpoint } from '../../src/components/shared/ResponsiveLayout';

function ScoreCard() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-sage text-sm mb-2">Bio Optimization Score</Text>
      <Text className="text-white text-lg font-semibold">Not enough data</Text>
      <Text className="text-sage text-xs mt-2">
        Score appears after a real Bio Optimization row. This card does not invent a number.
      </Text>
    </View>
  );
}

function SupplementTrackerCard() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-sage text-sm mb-3">Today&apos;s Supplements</Text>
      <Text className="text-white text-sm">Not enough data</Text>
      <Text className="text-sage text-xs mt-2">
        Protocol SKUs appear from a real row. This list does not invent supplement names.
      </Text>
    </View>
  );
}

function InsightsCard() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-sage text-sm mb-3">AI Insights</Text>
      <Text className="text-white text-sm">Not analyzed</Text>
      <Text className="text-sage text-xs mt-2">
        Insights appear from a real genotype or biometric row. This card does not invent variant copy or percents.
      </Text>
    </View>
  );
}

export default function ConsumerDashboard() {
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';

  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-1">
        Good morning
      </Text>
      <Text className="text-sage text-sm mb-6">
        One Genome. One Formulation. One Life at a Time.
      </Text>

      {isDesktop ? (
        <View className="flex-row gap-4">
          <View className="flex-1">
            <ScoreCard />
          </View>
          <View className="flex-1">
            <SupplementTrackerCard />
          </View>
          <View className="flex-1">
            <InsightsCard />
          </View>
        </View>
      ) : (
        <View className="gap-4">
          <ScoreCard />
          <SupplementTrackerCard />
          <InsightsCard />
        </View>
      )}
    </ScrollView>
  );
}
