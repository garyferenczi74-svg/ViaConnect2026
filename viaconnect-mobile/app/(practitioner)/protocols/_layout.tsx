import { Stack } from 'expo-router';

export default function ProtocolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#111827' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="builder"
        options={{
          title: 'Protocol Builder',
          headerBackTitle: 'Protocols',
        }}
      />
    </Stack>
  );
}
