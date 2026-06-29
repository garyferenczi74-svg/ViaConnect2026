/**
 * src/lib/formavision/telemetry/useAvatarDwell.ts
 *
 * Prompt 210b P8-T2a: Dwell-time accumulator and React hook for the
 * FormaVision avatar surface.
 *
 * Exports:
 *   createDwellAccumulator  pure factory (injected nowFn; node-testable)
 *   DwellAccumulator        interface for the accumulator object
 *   useAvatarDwell          React hook that wires DOM events to the accumulator
 *
 * Design:
 *   - The accumulator tracks ACTIVE-VISIBLE wall-clock using performance.now()
 *     (monotonic; immune to wall-clock adjustments).
 *   - On visibilitychange->hidden and pagehide, it emits
 *     'formavision.avatar_session_ended' with { dwellMs }.
 *   - Guards: never emits 0ms dwell; skips redundant emits if no visible time
 *     accrued since the last emit (handles both events firing in sequence).
 *   - Fail-open: SSR-safe (window guard), never throws. No new dependencies.
 *
 * Standing rules: no em-dashes, no en-dashes, no emojis, no any cast.
 */

import { useEffect, useRef } from 'react';
import type { AvatarTelemetryEvent, AvatarEventProperties } from './avatarTelemetry';

// ---------------------------------------------------------------------------
// DwellAccumulator -- pure, injectable nowFn, node-testable
// ---------------------------------------------------------------------------

export interface DwellAccumulator {
  /** Call when the page becomes visible (or on mount if already visible). */
  onVisible(): void;
  /**
   * Call when the page becomes hidden (visibilitychange or pagehide).
   * Returns the dwellMs to emit, or 0 if nothing new to report (dedup guard).
   */
  onHidden(): number;
}

/**
 * Creates a pure dwell accumulator. Accepts an optional nowFn for testing
 * (defaults to performance.now when called in a browser context).
 *
 * State machine:
 *   onVisible -> records lastVisibleStart
 *   onHidden  -> accumulates (now - lastVisibleStart) into total, clears start,
 *                returns Math.round(total) if the rounded dwell advanced, else 0
 */
export function createDwellAccumulator(
  nowFn: () => number = () => performance.now(),
): DwellAccumulator {
  let accumulated = 0;
  let lastVisibleStart: number | null = null;
  // Dedup sentinel: the last ROUNDED integer dwellMs we emitted. Comparing
  // rounded integers (not the raw float accumulator) keeps the guard robust
  // against float-equality fragility. -1 means nothing emitted yet.
  let lastEmittedDwellMs = -1;

  return {
    onVisible(): void {
      lastVisibleStart = nowFn();
    },

    onHidden(): number {
      if (lastVisibleStart !== null) {
        accumulated += nowFn() - lastVisibleStart;
        lastVisibleStart = null;
      }
      const dwellMs = Math.round(accumulated);
      // Zero-guard: never emit a 0ms dwell (sub-ms visible time rounds to 0).
      if (dwellMs <= 0) return 0;
      // Dedup: skip if the rounded dwell has not advanced since the last emit
      // (e.g. visibilitychange->hidden then pagehide with no interleaved visible).
      if (dwellMs <= lastEmittedDwellMs) return 0;
      lastEmittedDwellMs = dwellMs;
      return dwellMs;
    },
  };
}

// ---------------------------------------------------------------------------
// useAvatarDwell -- React hook
//
// Wires document 'visibilitychange' + window 'pagehide' to the accumulator.
// The emit callback is kept in a ref so the effect never needs to be
// re-registered when the userId resolves (the callback is stable from
// useAvatarTelemetry's useCallback([], [])).
// ---------------------------------------------------------------------------

/**
 * Tracks the user's active-visible dwell time on the avatar composition surface
 * and emits 'formavision.avatar_session_ended' with { dwellMs } when they leave.
 *
 * @param emit - Stable emit function from useAvatarTelemetry (takes event + properties).
 */
export function useAvatarDwell(
  emit: (event: AvatarTelemetryEvent, properties?: AvatarEventProperties) => void,
): void {
  // Keep emit in a ref so the visibilitychange listener always sees the latest
  // version without needing to re-register the effect.
  const emitRef = useRef(emit);
  emitRef.current = emit;

  useEffect(() => {
    // SSR guard: document and window may not exist in a server render.
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const accumulator = createDwellAccumulator();

    // Start the timer immediately if the tab is already visible at mount.
    if (document.visibilityState !== 'hidden') {
      accumulator.onVisible();
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === 'hidden') {
        const dwellMs = accumulator.onHidden();
        if (dwellMs > 0) {
          emitRef.current('formavision.avatar_session_ended', { dwellMs });
        }
      } else {
        // Returning to visible: restart the timer.
        accumulator.onVisible();
      }
    }

    function handlePageHide(): void {
      // pagehide is more reliable than visibilitychange on iOS/tab-close.
      // The dedup guard in onHidden() returns 0 if visibilitychange already
      // emitted with the same accumulated total, so no duplicate insert is made.
      const dwellMs = accumulator.onHidden();
      if (dwellMs > 0) {
        emitRef.current('formavision.avatar_session_ended', { dwellMs });
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
    // Empty deps: accumulator and emitRef are both stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
