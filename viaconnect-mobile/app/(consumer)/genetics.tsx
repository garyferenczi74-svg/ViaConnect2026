import { View, Text, ScrollView } from 'react-native';

export default function GeneticsScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Genetics</Text>
      <Text className="text-sage">Your GENEX360 genetic profile</Text>
    </ScrollView>
  );
}
