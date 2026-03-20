import { View, Text, ScrollView } from 'react-native';

export default function SupplementsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Supplements</Text>
      <Text className="text-sage">Your personalized supplement stack</Text>
    </ScrollView>
  );
}
