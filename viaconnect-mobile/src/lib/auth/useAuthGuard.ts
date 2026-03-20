import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore, type UserRole } from './store';

/**
 * Hook that redirects unauthenticated users to login,
 * and authenticated users to their correct portal.
 */
export function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, profile, role, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // Not logged in → push to login (unless already in auth group)
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Logged in but still in auth group → redirect to portal
    if (inAuthGroup) {
      // If onboarding not completed (consumer), go to onboarding
      if (role === 'consumer' && profile && !profile.onboarding_completed) {
        router.replace('/(auth)/onboarding/1');
        return;
      }
      redirectToPortal(router, role);
    }
  }, [session, profile, role, isLoading, segments]);
}

/**
 * Redirects to the correct portal based on user role.
 */
export function redirectToPortal(
  router: ReturnType<typeof useRouter>,
  role: UserRole | null,
) {
  switch (role) {
    case 'practitioner':
      router.replace('/(practitioner)');
      break;
    case 'naturopath':
      router.replace('/(naturopath)');
      break;
    case 'consumer':
    default:
      router.replace('/(consumer)');
      break;
  }
}

/**
 * Returns the portal path for a given role.
 */
export function getPortalPath(role: UserRole | null): string {
  switch (role) {
    case 'practitioner':
      return '/(practitioner)';
    case 'naturopath':
      return '/(naturopath)';
    case 'consumer':
    default:
      return '/(consumer)';
  }
}
