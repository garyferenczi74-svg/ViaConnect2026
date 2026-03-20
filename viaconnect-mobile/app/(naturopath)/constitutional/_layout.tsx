import { Stack } from 'expo-router';

export default function ConstitutionalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#111827' } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
