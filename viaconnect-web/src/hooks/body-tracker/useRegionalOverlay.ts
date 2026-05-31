'use client';

// useRegionalOverlay  the Phase 1 regional composition overlay controller
// (ViaConnect Prompt #169e(a)). Owns the two visualization preferences from
// Sections 6.1 + 5.1 (the overlay on/off toggle and the distribution-pattern
// choice), plus the opt-in flag the protective suppressions (Sections 5.3 / 5.4)
// read.
//
// PERSISTENCE (Section 7) is CLIENT-SIDE localStorage keyed by user id. The
// per-user preference store in this codebase is typed `profiles` columns; adding
// new keys there needs a schema migration, which is forbidden for this work, and
// there is no jsonb/settings store to reuse. These two prefs are purely cosmetic
// view state (not health data), so localStorage is the correct no-migration home.
// The serialization contract is the pure, tested module
// src/lib/body-tracker/regional-overlay-prefs.ts; this hook is just I/O + state.
//
// The safeguard MODE is derived from the EXISTING disordered-eating safeguard
// (#169b, profiles.body_scan_de_response) via useDisorderedEatingSafeguard: a
// CURRENT history hides the overlay by default (opt-in), a PAST history shows it
// by default. We do not add any new safeguard storage.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDisorderedEatingSafeguard } from './useDisorderedEatingSafeguard';
import type { DistributionPattern } from '@/lib/body-tracker/regional-distribution-ratios';
import type { SafeguardMode } from '@/lib/body-tracker/regional-fat-distribution';
import {
  DEFAULT_REGIONAL_OVERLAY_PREFS,
  readRegionalOverlayPrefs,
  writeRegionalOverlayPrefs,
  type RegionalOverlayPrefs,
} from '@/lib/body-tracker/regional-overlay-prefs';

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UseRegionalOverlayResult {
  /** Overlay on/off (Section 6.1). */
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  /** Explicit distribution-pattern choice, or null to derive from sex (5.1). */
  chosenPattern: DistributionPattern | null;
  setChosenPattern: (next: DistributionPattern | null) => void;
  /** Opt-in despite a protective suppression (5.3 / 5.4). */
  optedInDespiteSuppression: boolean;
  setOptedInDespiteSuppression: (next: boolean) => void;
  /**
   * The body-image safeguard posture (5.4), derived from the existing
   * disordered-eating response. 'none' until loaded / when no history disclosed.
   */
  safeguardMode: SafeguardMode;
  /** True while the safeguard response is still loading. */
  isLoading: boolean;
}

export function useRegionalOverlay(userId: string | null): UseRegionalOverlayResult {
  const { response: deResponse, isLoading: deLoading } = useDisorderedEatingSafeguard();
  const [prefs, setPrefs] = useState<RegionalOverlayPrefs>({ ...DEFAULT_REGIONAL_OVERLAY_PREFS });

  // Hydrate from localStorage once the user id is known (client-only).
  useEffect(() => {
    if (!userId) return;
    setPrefs(readRegionalOverlayPrefs(browserStorage(), userId));
  }, [userId]);

  // A single writer that updates state optimistically and persists, keyed by user.
  const update = useCallback(
    (patch: Partial<RegionalOverlayPrefs>) => {
      setPrefs((cur) => {
        const next = { ...cur, ...patch };
        if (userId) writeRegionalOverlayPrefs(browserStorage(), userId, next);
        return next;
      });
    },
    [userId],
  );

  const setEnabled = useCallback((next: boolean) => update({ enabled: next }), [update]);
  const setChosenPattern = useCallback(
    (next: DistributionPattern | null) => update({ chosenPattern: next }),
    [update],
  );
  const setOptedInDespiteSuppression = useCallback(
    (next: boolean) => update({ optedInDespiteSuppression: next }),
    [update],
  );

  const safeguardMode: SafeguardMode = useMemo(() => {
    if (deResponse === 'currently') return 'current_de_history';
    if (deResponse === 'in_the_past') return 'past_de_history';
    return 'none';
  }, [deResponse]);

  return useMemo(
    () => ({
      enabled: prefs.enabled,
      setEnabled,
      chosenPattern: prefs.chosenPattern,
      setChosenPattern,
      optedInDespiteSuppression: prefs.optedInDespiteSuppression,
      setOptedInDespiteSuppression,
      safeguardMode,
      isLoading: deLoading,
    }),
    [prefs, setEnabled, setChosenPattern, setOptedInDespiteSuppression, safeguardMode, deLoading],
  );
}
