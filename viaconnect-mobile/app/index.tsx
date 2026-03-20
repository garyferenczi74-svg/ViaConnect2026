import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/lib/auth/store';

export default function HomeScreen() {
  const { session, role, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-bg">
        <ActivityIndicator color="#B75F19" size="large" />
        <Text className="text-dark-border text-sm mt-4">Loading ViaConnect...</Text>
      </View>
    );
  }

  // Not authenticated → login
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Consumer who hasn't completed onboarding → CAQ
  if (role === 'consumer' && profile && !profile.onboarding_completed) {
    return <Redirect href="/(auth)/onboarding/1" />;
  }

  // Redirect to correct portal
  switch (role) {
    case 'practitioner':
      return <Redirect href="/(practitioner)" />;
    case 'naturopath':
      return <Redirect href="/(naturopath)" />;
    case 'consumer':
    default:
      return <Redirect href="/(consumer)" />;
  }
}
