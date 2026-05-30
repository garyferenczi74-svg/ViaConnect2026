'use client';

// useDisorderedEatingSafeguard  read/write the disordered-eating history answer
// and apply its response-adaptive defaults (Prompt #169b, Task 16, section 3).
//
// Exposes:
//   * hasAnswered     whether the one-screen question has been answered (so it
//     is shown once, before the educational walkthrough, on first Body Scan
//     open). Null while loading.
//   * response        the stored answer (or null).
//   * isLoading
//   * recordResponse(value)  persist the answer AND seed the response-adaptive
//     defaults (section 3.2.2) in a single profiles write: it sets the EXISTING
//     profiles.numbers_optional plus the new suggestion / resource-card /
//     body-fat-hidden columns from migration 20260516000110.
//
// PERSISTENCE: profiles (the same store as unit_system / numbers_optional). The
// new columns are not yet in the generated supabase types, so reads/writes use a
// narrow cast, matching useNumbersOptional + useBodyScanAgeGate.
//
// The mapping ITSELF (response -> defaults) is the pure, unit-tested module
// src/lib/body-tracker/disordered-eating-safeguard.ts; this hook is only I/O.
//
// PRIVACY: this value is owner-only and never exposed to practitioners. This
// hook reads/writes ONLY the signed-in user's own profile row.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  responseAdaptiveDefaults,
  isDisorderedEatingResponse,
  type DisorderedEatingResponse,
} from '@/lib/body-tracker/disordered-eating-safeguard';

export interface UseDisorderedEatingSafeguardResult {
  hasAnswered: boolean | null;
  response: DisorderedEatingResponse | null;
  isLoading: boolean;
  recordResponse: (value: DisorderedEatingResponse) => Promise<boolean>;
}

interface DeProfileRow {
  body_scan_de_response?: string | null;
  body_scan_de_answered_at?: string | null;
}

export function useDisorderedEatingSafeguard(): UseDisorderedEatingSafeguardResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean | null>(null);
  const [response, setResponse] = useState<DisorderedEatingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) { setHasAnswered(null); setIsLoading(false); }
          return;
        }
        if (!cancelled) setUserId(user.id);
        const { data: profile } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: DeProfileRow | null }>;
              };
            };
          };
        })
          .from('profiles')
          .select('body_scan_de_response, body_scan_de_answered_at')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled) {
          const stored = profile?.body_scan_de_response;
          const answered = Boolean(profile?.body_scan_de_answered_at);
          setResponse(isDisorderedEatingResponse(stored) ? stored : null);
          setHasAnswered(answered);
        }
      } catch {
        // Fail-safe: if we cannot read, treat as "not answered" so the question
        // is shown (rather than skipped) on first open; the user can answer or
        // pick "prefer not to say".
        if (!cancelled) setHasAnswered(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const recordResponse = useCallback(async (value: DisorderedEatingResponse): Promise<boolean> => {
    // Optimistic local update so the question screen advances immediately.
    setResponse(value);
    setHasAnswered(true);
    if (!userId) return false;
    try {
      const supabase = createClient();
      const defaults = responseAdaptiveDefaults(value);
      // Single write: the answer + answered timestamp + the seeded adaptive
      // defaults (numbers_optional reuses the existing column; the rest are the
      // new 20260516000110 columns). The user can change any of these later.
      const patch: Record<string, unknown> = {
        body_scan_de_response: value,
        body_scan_de_answered_at: new Date().toISOString(),
        numbers_optional: defaults.numbersOptionalDefault,
        body_scan_scan_frequency_suggestion_days: defaults.scanFrequencySuggestionDays,
        body_scan_resource_card_persistence: defaults.resourceCardPersistence,
        body_scan_body_fat_hidden: defaults.bodyFatHiddenByDefault,
      };
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          update: (v: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      })
        .from('profiles')
        .update(patch)
        .eq('id', userId);
      return !error;
    } catch {
      return false;
    }
  }, [userId]);

  return { hasAnswered, response, isLoading, recordResponse };
}
