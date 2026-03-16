import type { PortalType } from '@genex360/core';
import { PORTAL_PATHS } from '@genex360/core';

// Note: These are type-safe hook signatures.
// React implementations will be in the web app using these as a foundation.

export type UseSupabaseReturn = {
  supabase: ReturnType<typeof import('./browser').createBrowserClient>;
};

export type UseAuthReturn = {
  user: { id: string; email: string; role: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export type UseSessionReturn = {
  session: { accessToken: string; refreshToken: string; expiresAt: number } | null;
  loading: boolean;
};

export type UsePortalReturn = {
  portal: PortalType | null;
  portalPath: string | null;
};

export function getPortalFromPathname(pathname: string): PortalType | null {
  for (const [key, path] of Object.entries(PORTAL_PATHS)) {
    if (pathname.startsWith(path)) {
      return key as PortalType;
    }
  }
  return null;
}
