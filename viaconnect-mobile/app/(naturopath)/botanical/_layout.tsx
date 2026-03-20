import { Stack } from 'expo-router';

export default function BotanicalLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#111827' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="formula-builder"
        options={{ title: 'Formula Builder', headerBackTitle: 'Botanical' }}
      />
    </Stack>
  );
}
