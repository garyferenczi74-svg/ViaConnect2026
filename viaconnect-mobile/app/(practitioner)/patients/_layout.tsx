import { Stack } from 'expo-router';

export default function PatientsLayout() {
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
        name="[id]/index"
        options={{
          title: 'Patient Detail',
          headerBackTitle: 'Patients',
        }}
      />
    </Stack>
  );
}
