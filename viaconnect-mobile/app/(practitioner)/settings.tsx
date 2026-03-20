import { View, Text, ScrollView } from 'react-native';

export default function PractitionerSettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Settings</Text>
      <Text className="text-sage">Practice configuration and preferences</Text>
    </ScrollView>
  );
}
