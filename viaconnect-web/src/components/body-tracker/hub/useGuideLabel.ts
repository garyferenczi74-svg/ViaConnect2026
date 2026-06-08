'use client';

// Prompt 180 (2026-06-08): fail open Getting Started vs Refresh label
// resolver for the My Biology Hub guidance strip.
//
// The label keys off a completion flag, conceptually
// has_seen_bodytracker_guide. First run shows "Getting Started"; once
// the user has completed or dismissed the tutorial (a later series
// will write the flag) the label shows "Refresh".
//
// Resilience contract:
//   - Read fail open from profiles.has_seen_bodytracker_guide via a
//     short timeout. If the column does not exist yet, the supabase
//     error surfaces and we default to first run.
//   - Try / catch the entire read; any error returns first run.
//   - No schema change in this prompt. If the column never lands the
//     hook stays on first run permanently and the label reads
//     "Getting Started".

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';

export type GuideLabelState = 'first_run' | 'returning';

const TIMEOUT_MS = 2_500;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`guide label timeout ${ms}ms`)), ms),
    ),
  ]);
}

export function useGuideLabel(): GuideLabelState {
  const [state, setState] = useState<GuideLabelState>('first_run');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        const authResult = (await withTimeout(
          supabase.auth.getUser(),
          TIMEOUT_MS,
        )) as { data: { user: { id: string } | null } };
        const user = authResult.data.user;
        if (!user) return;

        const profileResult = (await withTimeout(
          supabase
            .from('profiles')
            .select('has_seen_bodytracker_guide')
            .eq('id', user.id)
            .maybeSingle(),
          TIMEOUT_MS,
        )) as { data: { has_seen_bodytracker_guide?: boolean } | null; error: { message: string } | null };
        const { data, error } = profileResult;

        // Column may not exist yet (the persisting series wires it).
        // On any error we stay on first run; that's the safe default.
        if (error) {
          safeLog.warn('hub.guide_label', 'profile read returned error; defaulting to first_run', {
            error: error.message,
          });
          return;
        }

        if (!cancelled && data?.has_seen_bodytracker_guide === true) {
          setState('returning');
        }
      } catch (err) {
        safeLog.warn('hub.guide_label', 'read threw; defaulting to first_run', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default useGuideLabel;
