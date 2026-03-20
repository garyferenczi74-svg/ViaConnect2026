import { Stack } from 'expo-router';
import { ProtectedRoute } from '../../src/lib/auth/ProtectedRoute';

export default function ConsumerLayout() {
  return (
    <ProtectedRoute allowedRoles={['consumer']}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#224852' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#111827' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Personal Wellness' }}
        />
      </Stack>
    </ProtectedRoute>
  );
}
