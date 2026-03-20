import { View, Text, ScrollView } from 'react-native';

export default function ClientsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Clients</Text>
      <Text className="text-sage">Client roster and formula assignments</Text>
    </ScrollView>
  );
}
