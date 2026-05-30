'use client';

// useBodyScanAgeGate  reads the data the client age gate + slow-down advisory
// need (Prompt #169b, spec section 4 age gate + section 3.2.3 frequency advisory).
//
// Reads directly from Supabase (matching the body-tracker dashboard page, which
// already reads profiles.date_of_birth via the browser client). Two reads:
//   1. profiles.date_of_birth  -> age-gate decision (under-18 / dob-missing).
//   2. body_photo_sessions.session_date for the trailing 7 days -> the "slow
//      down" advisory trigger (3+ attempts in 7 days).
//
// The decisions themselves are the pure functions in
// src/lib/body-tracker/age-frequency-gate.ts (unit-tested there). This hook is
// just the I/O + a thin mapping. The AUTHORITATIVE age + frequency gate is the
// server finalize in body-scan-analyze; this hook only powers UX.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  decideAgeGate,
  shouldShowSlowDownBanner,
  SLOW_DOWN_WINDOW_DAYS,
  type AgeGateDecision,
} from '@/lib/body-tracker/age-frequency-gate';

export interface UseBodyScanAgeGateResult {
  // Null while loading or when no authenticated user; otherwise the age-gate
  // decision (allowed / under_age / dob_missing).
  decision: AgeGateDecision | null;
  // True when the user has 3+ scan attempts in the trailing 7 days.
  showSlowDown: boolean;
  isLoading: boolean;
}

export function useBodyScanAgeGate(): UseBodyScanAgeGateResult {
  const [decision, setDecision] = useState<AgeGateDecision | null>(null);
  const [showSlowDown, setShowSlowDown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) { setDecision(null); setIsLoading(false); }
          return;
        }

        // 1. DOB -> age-gate decision.
        const { data: profileRow } = await (supabase as any)
          .from('profiles')
          .select('date_of_birth')
          .eq('id', user.id)
          .maybeSingle();

        // 2. Recent scan attempts (trailing 7 days) -> slow-down advisory.
        // session_date is a DATE; comparing against the 7-day-ago date is the
        // available granularity (the day-level count is sufficient for the
        // informational banner). Pull a small page and let the pure helper count.
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - SLOW_DOWN_WINDOW_DAYS);
        const cutoffIso = cutoff.toISOString().slice(0, 10);
        const { data: attemptRows } = await (supabase as any)
          .from('body_photo_sessions')
          .select('session_date')
          .eq('user_id', user.id)
          .gte('session_date', cutoffIso)
          .order('session_date', { ascending: false })
          .limit(50);

        if (cancelled) return;

        setDecision(decideAgeGate(profileRow?.date_of_birth ?? null));
        const stamps = ((attemptRows as Array<{ session_date: string | null }> | null) ?? [])
          .map((r) => r.session_date);
        setShowSlowDown(shouldShowSlowDownBanner(stamps));
      } catch {
        // Fail-open for UX: if we cannot read the DOB, do not hard-block the
        // entry from the client (the server still enforces the real age gate).
        if (!cancelled) setDecision({ status: 'allowed', ageYears: null });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { decision, showSlowDown, isLoading };
}
