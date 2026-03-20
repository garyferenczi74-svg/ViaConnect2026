import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore, type UserRole } from './store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required role(s) to access this route */
  allowedRoles?: UserRole[];
}

/**
 * HOC-style component that checks auth + role for portal access.
 * Wrap portal layouts with this to enforce access control.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator color="#B75F19" size="large" />
        <Text className="text-dark-border text-sm mt-4">Loading...</Text>
      </View>
    );
  }

  // Not authenticated → redirect to login
  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  // Role check
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Wrong portal — send to their correct one
    switch (role) {
      case 'practitioner':
        return <Redirect href="/(practitioner)" />;
      case 'naturopath':
        return <Redirect href="/(naturopath)" />;
      case 'consumer':
      default:
        return <Redirect href={'/(consumer)' as never} />;
    }
  }

  return <>{children}</>;
}
