import { View, Text, ScrollView } from 'react-native';

export default function InsightsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">AI Insights</Text>
      <Text className="text-sage">Gene-based recommendations powered by Claude</Text>
    </ScrollView>
  );
}
