'use client';

// useBodyScanInclusivityWaitlist  read whether the user has already opted into
// the body-scan inclusivity waitlist, and write an opt-in (Prompt #169b, Task 19,
// spec section 7.3 / 7.4).
//
// Exposes:
//   * isLoading
//   * alreadyJoined  whether the user already has a waitlist row (so the UI can
//     show a "you're on the list" confirmation instead of the form).
//   * joinWaitlist(...)  write the opt-in. Resolves true on success.
//
// PERSISTENCE: body_scan_inclusivity_waitlist (migration 20260516000070), owner
// RLS, UNIQUE(user_id). The write is an UPSERT with onConflict 'user_id' +
// ignoreDuplicates (insert-on-conflict-do-nothing), so a second opt-in keeps the
// FIRST request and is a no-op rather than an error.
//
// The payload + upsert option shaping are the pure, unit-tested module
// src/lib/body-tracker/body-scan-model-versions.ts; this hook is only I/O +
// React state (matching the useBiometricConsent / useCaqFreshness pattern).

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  buildWaitlistInsertPayload,
  buildWaitlistUpsertOptions,
  type WaitlistOptInArgs,
} from '@/lib/body-tracker/body-scan-model-versions';

export interface UseBodyScanInclusivityWaitlistResult {
  isLoading: boolean;
  alreadyJoined: boolean;
  // Persist the opt-in. Resolves true on a successful write (or when the row
  // already existed, since the conflict no-op is also a success from the user's
  // point of view). False on an error.
  joinWaitlist: (args?: WaitlistOptInArgs) => Promise<boolean>;
}

// Narrow structural casts for the loose Supabase access (the table is not in the
// generated supabase types), matching the body-tracker hooks pattern.
type WaitlistReader = {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { id: string } | null }>;
      };
    };
  };
};

type WaitlistWriter = {
  from: (t: string) => {
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string; ignoreDuplicates: boolean },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export function useBodyScanInclusivityWaitlist(): UseBodyScanInclusivityWaitlistResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
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
        const sb = supabase as unknown as WaitlistReader;
        const { data } = await sb
          .from('body_scan_inclusivity_waitlist')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled) setAlreadyJoined(!!data);
      } catch {
        // Fail-open: on a read error, assume not joined so the user can still
        // opt in (a duplicate write is a harmless no-op via the conflict clause).
        if (!cancelled) setAlreadyJoined(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const joinWaitlist = useCallback(async (args: WaitlistOptInArgs = {}): Promise<boolean> => {
    if (!userId) return false;
    try {
      const supabase = createClient();
      const payload = buildWaitlistInsertPayload(userId, args);
      const options = buildWaitlistUpsertOptions();
      const sb = supabase as unknown as WaitlistWriter;
      const { error } = await sb
        .from('body_scan_inclusivity_waitlist')
        // Spread into a plain record: the typed payload interface does not
        // structurally match the loose Record<string, unknown> writer signature
        // (TS will not widen a known-keys interface to an index signature).
        .upsert({ ...payload }, options);
      if (error) return false;
      setAlreadyJoined(true);
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  return { isLoading, alreadyJoined, joinWaitlist };
}
