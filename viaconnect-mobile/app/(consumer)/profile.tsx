import { View, Text, ScrollView } from 'react-native';

export default function ProfileScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Profile</Text>
      <Text className="text-sage">Manage your account and preferences</Text>
    </ScrollView>
  );
}
