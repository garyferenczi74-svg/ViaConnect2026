/**
 * src/lib/formavision/telemetry/useAvatarTelemetry.ts
 *
 * Prompt 210b P8-T1b: thin hook binding emitAvatarEvent to the active userId
 * and the composition surface page context.
 *
 * Exports:
 *   createAvatarTelemetryActions  pure factory (no React, testable in node)
 *   createScrubSettleEmitter      pure debounce helper for scrub telemetry
 *   useAvatarTelemetry            React hook wrapping the factory with stable refs
 *
 * Standing rules: no em-dashes, no en-dashes, fail-open, no new dependencies.
 */

import { useCallback, useRef } from 'react';
import { emitAvatarEvent, getAvatarSessionId } from './avatarTelemetry';
import type { AvatarTelemetryEvent, AvatarEventProperties } from './avatarTelemetry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMPOSITION_PAGE = '/body-tracker/composition';

// ---------------------------------------------------------------------------
// createAvatarTelemetryActions -- pure factory, no React, node-testable
//
// The factory owns the once-per-lifecycle guard as a plain Set. A new
// factory instance resets the guard (intended: a page navigation to a fresh
// mount gets a fresh guard). The hook wraps a stable factory in a ref so
// re-renders and userId resolution never lose the guard state mid-session.
// ---------------------------------------------------------------------------

export interface AvatarTelemetryActions {
  emit: (
    userId: string | null | undefined,
    event: AvatarTelemetryEvent,
    properties?: AvatarEventProperties,
  ) => void;
  emitOnce: (
    userId: string | null | undefined,
    event: AvatarTelemetryEvent,
    properties?: AvatarEventProperties,
  ) => void;
}

export function createAvatarTelemetryActions(): AvatarTelemetryActions {
  const onceFired = new Set<AvatarTelemetryEvent>();

  function emit(
    userId: string | null | undefined,
    event: AvatarTelemetryEvent,
    properties: AvatarEventProperties = {},
  ): void {
    void emitAvatarEvent(userId, event, properties, {
      page: COMPOSITION_PAGE,
      sessionId: getAvatarSessionId(),
    });
  }

  function emitOnce(
    userId: string | null | undefined,
    event: AvatarTelemetryEvent,
    properties: AvatarEventProperties = {},
  ): void {
    if (onceFired.has(event)) return;
    // Do NOT consume the once-guard while the userId is unresolved. If we
    // marked the event fired here, a falsy-userId call at mount would no-op
    // the insert yet permanently block the real event once auth resolves
    // (notably avatar_viewed when auth lands after the first render). Only
    // mark fired once a real insert can happen.
    if (!userId) return;
    onceFired.add(event);
    emit(userId, event, properties);
  }

  return { emit, emitOnce };
}

// ---------------------------------------------------------------------------
// createScrubSettleEmitter -- pure debounce helper, node-testable
//
// Debounces a callback so rapid calls fire the callback only once after
// the burst settles (default 400ms). Used for timeline_scrubbed so we
// emit once per scrub gesture rather than on every slider tick.
// ---------------------------------------------------------------------------

export interface ScrubSettleEmitter {
  /** Call on every scrub position change. Resets the debounce window. */
  notify: () => void;
  /** Cancel any pending settle callback (e.g. when scrub vector clears). */
  cancel: () => void;
}

export function createScrubSettleEmitter(
  onSettle: () => void,
  delayMs = 400,
): ScrubSettleEmitter {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    notify() {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onSettle();
      }, delayMs);
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// useAvatarTelemetry -- React hook
//
// Wraps createAvatarTelemetryActions in a stable ref so the once-guard
// survives re-renders and userId resolution. The userId is tracked via a
// current-ref so callbacks never need to be re-created when auth resolves.
//
// Returns:
//   emit(event, properties?)      fire-and-forget on every call
//   emitOnce(event, properties?)  fire at most once per mount lifecycle
// ---------------------------------------------------------------------------

export function useAvatarTelemetry(userId: string | null | undefined): {
  emit: (event: AvatarTelemetryEvent, properties?: AvatarEventProperties) => void;
  emitOnce: (event: AvatarTelemetryEvent, properties?: AvatarEventProperties) => void;
} {
  // Stable factory: persists across re-renders, reset on unmount/remount.
  const actionsRef = useRef<AvatarTelemetryActions | null>(null);
  if (actionsRef.current === null) {
    actionsRef.current = createAvatarTelemetryActions();
  }

  // Always-current userId without triggering callback re-creation.
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Stable callbacks: both read from refs only, no deps needed.
  const emit = useCallback(
    (event: AvatarTelemetryEvent, properties: AvatarEventProperties = {}) => {
      // actionsRef.current is non-null after the initializer above.
      actionsRef.current!.emit(userIdRef.current, event, properties);
    },
    // Both refs are stable across renders; no dep triggers re-creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const emitOnce = useCallback(
    (event: AvatarTelemetryEvent, properties: AvatarEventProperties = {}) => {
      actionsRef.current!.emitOnce(userIdRef.current, event, properties);
    },
    // Both refs are stable across renders; no dep triggers re-creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { emit, emitOnce };
}
