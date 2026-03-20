import { View, Text, ScrollView } from 'react-native';

export default function BotanicalsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Botanicals</Text>
      <Text className="text-sage">Full botanical database and monographs</Text>
    </ScrollView>
  );
}
