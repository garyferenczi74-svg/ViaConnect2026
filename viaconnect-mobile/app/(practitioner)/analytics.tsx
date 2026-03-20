import { View, Text, ScrollView } from 'react-native';

export default function AnalyticsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Analytics</Text>
      <Text className="text-sage">Practice analytics and patient outcomes</Text>
    </ScrollView>
  );
}
