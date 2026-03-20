import React, { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../supabase/client';
import { useAuthStore } from './store';
import { secureSession } from './secure-session';
import type { Profile } from '../supabase/types';

/** HIPAA inactivity timeout: 15 minutes */
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);
  const reset = useAuthStore((s) => s.reset);
  const touchActivity = useAuthStore((s) => s.touchActivity);

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile((data as Profile) ?? null);
    },
    [setProfile],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    await secureSession.clearTokens();
    reset();
  }, [reset]);

  // Inactivity checker
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - useAuthStore.getState().lastActivity;
      if (elapsed >= INACTIVITY_TIMEOUT_MS && useAuthStore.getState().session) {
        handleSignOut();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handleSignOut]);

  // Track app state to touch activity on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        touchActivity();
        // Refresh session when app comes to foreground
        supabase.auth.getSession();
      }
    });
    return () => sub.remove();
  }, [touchActivity]);

  // Supabase auth state listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        secureSession.saveTokens(
          session.access_token,
          session.refresh_token ?? '',
        );
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        await secureSession.saveTokens(
          session.access_token,
          session.refresh_token ?? '',
        );
      } else {
        setProfile(null);
        await secureSession.clearTokens();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading, fetchProfile]);

  return <>{children}</>;
}
