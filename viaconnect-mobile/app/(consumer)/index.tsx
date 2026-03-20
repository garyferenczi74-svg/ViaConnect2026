import { View, Text, ScrollView } from 'react-native';
import { useBreakpoint } from '../../src/components/shared/ResponsiveLayout';

function VitalityScoreCard() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-sage text-sm mb-2">Vitality Score</Text>
      <Text className="text-5xl font-bold text-copper">87</Text>
      <Text className="text-sage text-xs mt-1">+3 from last week</Text>
      <View className="mt-4 h-2 bg-dark-border rounded-full overflow-hidden">
        <View className="h-full w-[87%] bg-copper rounded-full" />
      </View>
    </View>
  );
}

function SupplementTrackerCard() {
  const supplements = [
    { name: 'MTHFR+', taken: true },
    { name: 'COMT+', taken: true },
    { name: 'NAD+', taken: false },
    { name: 'FOCUS+', taken: false },
  ];

  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-sage text-sm mb-3">Today's Supplements</Text>
      {supplements.map((s) => (
        <View
          key={s.name}
          className="flex-row items-center justify-between py-2 border-b border-dark-border"
        >
          <Text className="text-white font-mono text-sm">{s.name}</Text>
          <Text className={s.taken ? 'text-portal-green' : 'text-sage'}>
            {s.taken ? '✓ Taken' : '○ Pending'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InsightsCard() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-sage text-sm mb-3">AI Insights</Text>
      <View className="bg-teal/10 rounded-xl p-4 mb-3">
        <Text className="text-white text-sm">
          Your COMT gene variant suggests you metabolize catecholamines slowly.
          COMT+ is optimized for your genotype.
        </Text>
      </View>
      <View className="bg-copper/10 rounded-xl p-4">
        <Text className="text-white text-sm">
          Sleep quality improved 12% since starting NAD+ — keep it up!
        </Text>
      </View>
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
        // Desktop: 3-column layout
        <View className="flex-row gap-4">
          <View className="flex-1">
            <VitalityScoreCard />
          </View>
          <View className="flex-1">
            <SupplementTrackerCard />
          </View>
          <View className="flex-1">
            <InsightsCard />
          </View>
        </View>
      ) : (
        // Mobile: stacked cards
        <View className="gap-4">
          <VitalityScoreCard />
          <SupplementTrackerCard />
          <InsightsCard />
        </View>
      )}
    </ScrollView>
  );
}
