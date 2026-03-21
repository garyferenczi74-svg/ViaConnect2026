import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../supabase/types';

export type UserRole = 'consumer' | 'practitioner' | 'naturopath';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  lastActivity: number;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  touchActivity: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  lastActivity: Date.now(),

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) =>
    set({
      profile,
      role: profile
        ? mapDatabaseRoleToUserRole(profile.role)
        : null,
    }),

  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  touchActivity: () => set({ lastActivity: Date.now() }),
  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      role: null,
      isLoading: false,
      lastActivity: Date.now(),
    }),
}));

function mapDatabaseRoleToUserRole(
  dbRole: Profile['role'],
): UserRole {
  switch (dbRole) {
    case 'practitioner':
      return 'practitioner';
    case 'admin':
      return 'practitioner';
    case 'naturopath':
      return 'naturopath';
    case 'patient':
    default:
      return 'consumer';
  }
}
