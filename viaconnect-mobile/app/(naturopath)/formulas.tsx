import { View, Text, ScrollView } from 'react-native';

export default function FormulasScreen() {
  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-4">Formulas</Text>
      <Text className="text-sage">Saved formulas and templates</Text>
    </ScrollView>
  );
}
