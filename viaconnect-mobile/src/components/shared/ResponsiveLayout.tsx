import { Platform, useWindowDimensions } from 'react-native';

/** Breakpoint for desktop layout (matches Tailwind `lg`) */
const DESKTOP_BREAKPOINT = 1024;

/** Returns true when running on web at >= 1024px width */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}

/** Returns true when running on web at >= 768px width */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 768;
}

/** Returns current breakpoint tier */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return 'mobile';
  if (width >= DESKTOP_BREAKPOINT) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}
