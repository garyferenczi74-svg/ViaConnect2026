import { View, Text, ScrollView } from 'react-native';

export default function PatientsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Patients</Text>
      <Text className="text-sage">Full patient roster and management</Text>
    </ScrollView>
  );
}
