'use client';

// useNumbersOptional  the "Hide specific numbers" body-image safeguard
// (Prompt #169b, spec section 3.2.4). Available to ALL users.
//
// Exposes:
//   * numbersOptional  the per-user flag (profiles.numbers_optional),
//   * setNumbersOptional(next)  persist a new value (optimistic),
//   * a TEMPORARY-reveal mechanism: a metric can be revealed by tap-to-toggle or
//     by press-and-hold, then re-hidden. Reveals are in-memory only and reset on
//     reload (never persisted): the default is always "hidden".
//
// PERSISTENCE reuses the EXACT pattern of the existing per-user preference
// unit_system: a column on the profiles table, read with the Supabase browser
// client and written with profiles.update(...).eq('id', userId) (the same write
// the account page uses for full_name). No new persistence system. The DB column
// is added in migration 20260516000090. profiles.numbers_optional is not yet in
// the generated supabase types (types.ts drifts from the live schema), so the
// read/write use a narrow cast, matching useBodyScanAgeGate's profiles reads.
//
// CROSS-COMPONENT SYNC: the FLAG (not the persistence) is mirrored in a tiny
// module-level cache via useSyncExternalStore so the settings toggle and the
// results surfaces (which are separate React subtrees) reflect a flip live,
// without remounting the panel or re-fetching scan data. This is a client cache
// over the single server value, the same role React Query would play; it is NOT
// a second settings store. Reveal state is intentionally per-hook-instance so it
// stays panel-local and ephemeral.
//
// The reveal/decision LOGIC itself is the pure, unit-tested module
// src/lib/body-tracker/numbers-optional.ts; this hook is just I/O + React state.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  decideMetricDisplay,
  toggleRevealed,
  setRevealed as setRevealedPure,
  clearRevealed as clearRevealedPure,
  type MetricDisplayMode,
  type MetricSurface,
} from '@/lib/body-tracker/numbers-optional';

// ---------------------------------------------------------------------------
// Module-level client cache of the flag (shared across hook instances).
// `null` = not yet hydrated from the profile read.
// ---------------------------------------------------------------------------
let flagCache: boolean | null = null;
const flagListeners = new Set<() => void>();

function subscribeFlag(listener: () => void): () => void {
  flagListeners.add(listener);
  return () => { flagListeners.delete(listener); };
}
function getFlagSnapshot(): boolean | null {
  return flagCache;
}
function emitFlag(next: boolean): void {
  flagCache = next;
  for (const l of flagListeners) l();
}

export interface UseNumbersOptionalResult {
  // The persisted preference. False (show numbers) until loaded.
  numbersOptional: boolean;
  isLoading: boolean;
  // Persist a new value (optimistic local update, then a profiles write).
  setNumbersOptional: (next: boolean) => Promise<void>;

  // Temporary-reveal controls (in-memory, reset on reload).
  isRevealed: (metricId: string) => boolean;
  toggleReveal: (metricId: string) => void;   // tap-to-toggle
  revealHold: (metricId: string) => void;      // press-hold down
  hideHold: (metricId: string) => void;        // press-hold up

  // The per-metric display decision, wired to the current flag + reveal state.
  displayMode: (metricId: string, surface: MetricSurface) => MetricDisplayMode;
}

interface NumbersOptionalProfileRow {
  numbers_optional?: boolean | null;
}

export function useNumbersOptional(): UseNumbersOptionalResult {
  const cached = useSyncExternalStore(subscribeFlag, getFlagSnapshot, () => flagCache);
  const numbersOptional = cached ?? false;
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(cached === null);
  // In-memory set of temporarily-revealed metric ids. Never persisted; local to
  // this hook instance (so reveals are scoped to the results panel that owns it).
  const [revealed, setRevealedSet] = useState<Set<string>>(() => new Set());

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
                maybeSingle: () => Promise<{ data: NumbersOptionalProfileRow | null }>;
              };
            };
          };
        })
          .from('profiles')
          .select('numbers_optional')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled) {
          const value = profile && typeof profile.numbers_optional === 'boolean'
            ? profile.numbers_optional
            : false;
          emitFlag(value);
        }
      } catch {
        // Fail-safe for a safeguard preference: if the read fails, default to
        // showing numbers (the pre-existing behavior); never hard-block the UI.
        if (!cancelled && flagCache === null) emitFlag(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setNumbersOptional = useCallback(async (next: boolean) => {
    // Optimistic: flip the shared cache first so every consumer updates instantly.
    emitFlag(next);
    // Turning the safeguard back ON should not leak previously-revealed metrics.
    if (next) setRevealedSet(new Set());
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
        .update({ numbers_optional: next })
        .eq('id', userId);
    } catch {
      // Best-effort persistence; the optimistic cache value still applies for
      // this session even if the write fails.
    }
  }, [userId]);

  const isRevealed = useCallback((metricId: string) => revealed.has(metricId), [revealed]);

  const toggleReveal = useCallback((metricId: string) => {
    setRevealedSet((cur) => toggleRevealed(cur, metricId));
  }, []);

  const revealHold = useCallback((metricId: string) => {
    setRevealedSet((cur) => setRevealedPure(cur, metricId));
  }, []);

  const hideHold = useCallback((metricId: string) => {
    setRevealedSet((cur) => clearRevealedPure(cur, metricId));
  }, []);

  const displayMode = useCallback(
    (metricId: string, surface: MetricSurface): MetricDisplayMode =>
      decideMetricDisplay({
        numbersOptional,
        revealed: revealed.has(metricId),
        surface,
        metricId,
      }),
    [numbersOptional, revealed],
  );

  return useMemo(
    () => ({
      numbersOptional,
      isLoading,
      setNumbersOptional,
      isRevealed,
      toggleReveal,
      revealHold,
      hideHold,
      displayMode,
    }),
    [numbersOptional, isLoading, setNumbersOptional, isRevealed, toggleReveal, revealHold, hideHold, displayMode],
  );
}
