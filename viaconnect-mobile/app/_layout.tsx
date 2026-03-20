import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/lib/auth/AuthProvider';
import { useAuthGuard } from '../src/lib/auth/useAuthGuard';
import { useAuthStore } from '../src/lib/auth/store';
import { initPurchases, identifyUser } from '../src/services/purchases';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function NavigationGuard({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  return <>{children}</>;
}

/** Initialize RevenueCat and identify user when auth is ready. */
function PurchasesInitializer() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    initPurchases();
  }, []);

  useEffect(() => {
    if (userId) {
      identifyUser(userId);
    }
  }, [userId]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PurchasesInitializer />
        <NavigationGuard>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#224852' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: '#111827' },
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(consumer)" options={{ headerShown: false }} />
            <Stack.Screen name="(practitioner)" options={{ headerShown: false }} />
            <Stack.Screen name="(naturopath)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </NavigationGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
