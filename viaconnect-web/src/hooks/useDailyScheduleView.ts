'use client';

/**
 * Prompt 219d: shared Daily Schedule reader for Dashboard + My Supplements.
 * Sole client path into GET /api/supplements/schedule (Hannah slots + taken).
 * Three-layer resilience: timeout, fail-open honest unavailable state, safeLog.
 * Never fabricates counts.
 */

import { useCallback, useEffect, useState } from 'react';
import { safeLog } from '@/lib/utils/safe-log';
import type { ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';
import {
  EMPTY_SCHEDULE_VIEW,
  computeDailyScheduleCounts,
  setScheduleCardTaken,
  type DailyScheduleCounts,
} from '@/lib/supplements/dailyScheduleShared';

const SCOPE = 'hook.useDailyScheduleView';
/** Shared read timeout (ms). Fail-open on exceed. */
export const DAILY_SCHEDULE_FETCH_TIMEOUT_MS = 8000;

export type DailyScheduleStatus = 'loading' | 'ready' | 'unavailable';

export interface UseDailyScheduleViewResult {
  view: ScheduleView;
  counts: DailyScheduleCounts;
  status: DailyScheduleStatus;
  errorMessage: string | null;
  refresh: () => void;
  /**
   * Local optimistic replace (drag / move / remove on My Supplements).
   * Does not re-fetch; writers still hit the same schedule API.
   */
  replaceView: (next: ScheduleView | ((prev: ScheduleView) => ScheduleView)) => void;
  /** Optimistic toggle + POST to shared schedule intake API. */
  toggleTaken: (args: {
    slotId: string;
    userSupplementId: string;
    timeOfDay: TimeOfDay;
    nextTaken: boolean;
  }) => Promise<boolean>;
}

export function useDailyScheduleView(): UseDailyScheduleViewResult {
  const [view, setView] = useState<ScheduleView>(EMPTY_SCHEDULE_VIEW);
  const [status, setStatus] = useState<DailyScheduleStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const replaceView = useCallback(
    (next: ScheduleView | ((prev: ScheduleView) => ScheduleView)) => {
      setView(next);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      DAILY_SCHEDULE_FETCH_TIMEOUT_MS,
    );

    setStatus('loading');
    setErrorMessage(null);

    (async () => {
      try {
        const res = await fetch('/api/supplements/schedule', {
          method: 'GET',
          signal: controller.signal,
          credentials: 'same-origin',
        });
        if (!res.ok) {
          throw new Error(`http_${res.status}`);
        }
        const data = (await res.json()) as { view?: ScheduleView };
        if (!active) return;
        const next = data?.view ?? EMPTY_SCHEDULE_VIEW;
        setView({
          morning: next.morning ?? [],
          afternoon: next.afternoon ?? [],
          evening: next.evening ?? [],
        });
        setStatus('ready');
        setErrorMessage(null);
      } catch (err) {
        if (!active) return;
        const aborted = err instanceof Error && err.name === 'AbortError';
        safeLog.warn(SCOPE, 'schedule read failed (fail-open)', {
          error: err instanceof Error ? err.message : String(err),
          aborted,
        });
        setView(EMPTY_SCHEDULE_VIEW);
        setStatus('unavailable');
        setErrorMessage(
          aborted
            ? 'Schedule timed out. Retry when ready.'
            : 'Schedule unavailable. Retry when ready.',
        );
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [reloadKey]);

  const toggleTaken = useCallback(
    async (args: {
      slotId: string;
      userSupplementId: string;
      timeOfDay: TimeOfDay;
      nextTaken: boolean;
    }): Promise<boolean> => {
      const prev = view;
      setView((v) => setScheduleCardTaken(v, args.slotId, args.nextTaken));
      try {
        const res = await fetch('/api/supplements/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            userSupplementId: args.userSupplementId,
            timeOfDay: args.timeOfDay,
            taken: args.nextTaken,
          }),
        });
        const json = (await res.json().catch(() => ({ ok: false }))) as {
          ok?: boolean;
        };
        if (!res.ok || !json?.ok) {
          throw new Error('toggle_failed');
        }
        return true;
      } catch (err) {
        setView(prev);
        safeLog.warn(SCOPE, 'toggle failed; reverted', {
          slotId: args.slotId,
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      }
    },
    [view],
  );

  const counts = computeDailyScheduleCounts(view);

  return {
    view,
    counts,
    status,
    errorMessage,
    refresh,
    replaceView,
    toggleTaken,
  };
}
