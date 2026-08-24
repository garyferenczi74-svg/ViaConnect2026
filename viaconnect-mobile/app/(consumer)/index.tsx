import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useBreakpoint } from '../../src/components/shared/ResponsiveLayout';
import { MorningCard } from '../../src/components/consumer/MorningCard';
import {
  bosCurrentUrl,
  readBosCurrentScore,
} from '../../src/lib/morning-card/model';

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
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const url = bosCurrentUrl(process.env.EXPO_PUBLIC_WEB_URL);
    fetch(url, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => readBosCurrentScore(body))
      .then((value) => {
        if (live) setScore(value);
      })
      .catch(() => {
        if (live) setScore(null);
      });
    return () => {
      live = false;
    };
  }, []);

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
            <MorningCard score={score} protocolItems={[]} />
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
          <MorningCard score={score} protocolItems={[]} />
          <SupplementTrackerCard />
          <InsightsCard />
        </View>
      )}
    </ScrollView>
  );
}
