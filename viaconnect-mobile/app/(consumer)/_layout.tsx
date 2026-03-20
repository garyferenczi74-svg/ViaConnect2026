import { Stack } from 'expo-router';
import { ProtectedRoute } from '../../src/lib/auth/ProtectedRoute';
import { ViaConnectLogo } from '../../src/components/ui';

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
          options={{ headerTitle: () => <ViaConnectLogo size={100} showWordmark={false} /> }}
        />
      </Stack>
    </ProtectedRoute>
  );
}
