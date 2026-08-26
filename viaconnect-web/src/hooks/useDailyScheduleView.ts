'use client';

/**
 * Prompt 219d: shared Daily Schedule reader for Dashboard + My Supplements.
 * Sole client path into GET /api/supplements/schedule (Hannah slots + taken).
 * Three-layer resilience: timeout, fail-open honest unavailable state, safeLog.
 * Never fabricates counts.
 *
 * Brief 48: concurrent hook instances share one in-flight GET (and a short
 * ready remember) so the hero slot can resolve the same real rows Daily
 * Schedule already has. Fetch timeout stays 8000ms. Hero loading bound is
 * applied in firstIncompleteProtocolAction, not here.
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
import {
  clearDailyScheduleShare,
  peekDailyScheduleShare,
  rememberDailyScheduleShare,
  takeDailyScheduleInFlight,
  type DailyScheduleShareResult,
} from '@/lib/supplements/dailyScheduleReadShare';

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

function applyShareResult(result: DailyScheduleShareResult): {
  view: ScheduleView;
  status: DailyScheduleStatus;
  errorMessage: string | null;
} {
  if (result.ok) {
    return { view: result.view, status: 'ready', errorMessage: null };
  }
  return {
    view: EMPTY_SCHEDULE_VIEW,
    status: 'unavailable',
    errorMessage: result.message,
  };
}

function initialFromShare(): {
  view: ScheduleView;
  status: DailyScheduleStatus;
  errorMessage: string | null;
} {
  const peeked = peekDailyScheduleShare();
  if (!peeked) {
    return {
      view: EMPTY_SCHEDULE_VIEW,
      status: 'loading',
      errorMessage: null,
    };
  }
  return applyShareResult(peeked);
}

async function fetchScheduleShare(): Promise<DailyScheduleShareResult> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    DAILY_SCHEDULE_FETCH_TIMEOUT_MS,
  );
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
    const next = data?.view ?? EMPTY_SCHEDULE_VIEW;
    const view: ScheduleView = {
      morning: next.morning ?? [],
      afternoon: next.afternoon ?? [],
      evening: next.evening ?? [],
    };
    const result: DailyScheduleShareResult = { ok: true, view };
    rememberDailyScheduleShare(result);
    return result;
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    safeLog.warn(SCOPE, 'schedule read failed (fail-open)', {
      error: err instanceof Error ? err.message : String(err),
      aborted,
    });
    const result: DailyScheduleShareResult = {
      ok: false,
      aborted,
      message: aborted
        ? 'Schedule timed out. Retry when ready.'
        : 'Schedule unavailable. Retry when ready.',
    };
    rememberDailyScheduleShare(result);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export function useDailyScheduleView(): UseDailyScheduleViewResult {
  const [view, setView] = useState<ScheduleView>(
    () => initialFromShare().view,
  );
  const [status, setStatus] = useState<DailyScheduleStatus>(
    () => initialFromShare().status,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    () => initialFromShare().errorMessage,
  );
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    clearDailyScheduleShare();
    setReloadKey((k) => k + 1);
  }, []);

  const replaceView = useCallback(
    (next: ScheduleView | ((prev: ScheduleView) => ScheduleView)) => {
      setView((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        rememberDailyScheduleShare({ ok: true, view: resolved });
        return resolved;
      });
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const peeked = peekDailyScheduleShare();
    if (peeked && reloadKey === 0) {
      const applied = applyShareResult(peeked);
      setView(applied.view);
      setStatus(applied.status);
      setErrorMessage(applied.errorMessage);
      return () => {
        active = false;
      };
    }

    setStatus('loading');
    setErrorMessage(null);

    void takeDailyScheduleInFlight(fetchScheduleShare).then((result) => {
      if (!active) return;
      const applied = applyShareResult(result);
      setView(applied.view);
      setStatus(applied.status);
      setErrorMessage(applied.errorMessage);
    });

    return () => {
      active = false;
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
      const next = setScheduleCardTaken(view, args.slotId, args.nextTaken);
      setView(next);
      rememberDailyScheduleShare({ ok: true, view: next });
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
        rememberDailyScheduleShare({ ok: true, view: prev });
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
