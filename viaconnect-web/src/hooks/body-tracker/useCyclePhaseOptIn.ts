'use client';

// useCyclePhaseOptIn  the CONSUMER-ONLY cycle-phase trend-annotation opt-in
// (Prompt #169b, spec section 11.2.3). Granular opt-in, DEFAULT OFF.
//
// Exposes:
//   * optedIn   the per-user flag (profiles.cycle_phase_annotation_opt_in),
//   * isLoading
//   * setOptedIn(next)  persist a new value (optimistic).
//
// PERSISTENCE reuses the EXACT pattern of the sibling #169b preference
// numbers_optional (useNumbersOptional): a boolean column on the profiles table,
// read with the Supabase browser client and written with
// profiles.update(...).eq('id', userId). No new persistence system. The column is
// added in migration 20260516000120; like numbers_optional it is not yet in the
// generated supabase types (types.ts drifts from the live schema), so the
// read/write use a narrow cast, matching useNumbersOptional + useBodyScanAgeGate.
//
// PRIVACY: this is a consumer-only preference; it governs the consumer's own
// surface only and never affects practitioner / naturopath views. Fail-safe: if
// the read fails, default to OFF (the safeguard default).
//
// The phase MATH + the annotation copy live in the pure, unit-tested module
// src/lib/body-tracker/time-of-day-trend.ts; this hook is just I/O + React state.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_CYCLE_ANNOTATION_OPT_IN } from '@/lib/body-tracker/time-of-day-trend';

export interface UseCyclePhaseOptInResult {
  // The persisted preference. Default OFF until loaded.
  optedIn: boolean;
  isLoading: boolean;
  // Persist a new value (optimistic local update, then a profiles write).
  setOptedIn: (next: boolean) => Promise<void>;
}

interface CycleOptInProfileRow {
  cycle_phase_annotation_opt_in?: boolean | null;
}

export function useCyclePhaseOptIn(): UseCyclePhaseOptInResult {
  const [optedIn, setOptedInState] = useState<boolean>(DEFAULT_CYCLE_ANNOTATION_OPT_IN);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        if (!cancelled) setUserId(user.id);
        const { data: profile } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: CycleOptInProfileRow | null }>;
              };
            };
          };
        })
          .from('profiles')
          .select('cycle_phase_annotation_opt_in')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled) {
          const value = profile && typeof profile.cycle_phase_annotation_opt_in === 'boolean'
            ? profile.cycle_phase_annotation_opt_in
            : DEFAULT_CYCLE_ANNOTATION_OPT_IN;
          setOptedInState(value);
        }
      } catch {
        // Fail-safe: a sensitive opt-in defaults OFF if the read fails.
        if (!cancelled) setOptedInState(DEFAULT_CYCLE_ANNOTATION_OPT_IN);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setOptedIn = useCallback(async (next: boolean) => {
    // Optimistic local flip.
    setOptedInState(next);
    if (!userId) return;
    try {
      const supabase = createClient();
      await (supabase as unknown as {
        from: (t: string) => {
          update: (v: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      })
        .from('profiles')
        .update({ cycle_phase_annotation_opt_in: next })
        .eq('id', userId);
    } catch {
      // Best-effort persistence; the optimistic value still applies this session.
    }
  }, [userId]);

  return useMemo(
    () => ({ optedIn, isLoading, setOptedIn }),
    [optedIn, isLoading, setOptedIn],
  );
}
