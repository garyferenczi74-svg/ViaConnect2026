/**
 * Shared GET /api/supplements/schedule read for concurrent hook instances.
 * Hero MorningCard and Daily Schedule / TodaysProtocol each call
 * useDailyScheduleView(); without a share they can diverge (ready rows
 * below, hero still loading). Does not invent slots or counts.
 */

import type { ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';

export const DAILY_SCHEDULE_SHARE_TTL_MS = 10_000;

export type DailyScheduleShareReady = {
  ok: true;
  view: ScheduleView;
};

export type DailyScheduleShareFail = {
  ok: false;
  aborted: boolean;
  message: string;
};

export type DailyScheduleShareResult =
  | DailyScheduleShareReady
  | DailyScheduleShareFail;

type Remembered = {
  at: number;
  result: DailyScheduleShareResult;
};

let inFlight: Promise<DailyScheduleShareResult> | null = null;
let last: Remembered | null = null;

export function peekDailyScheduleShare(
  now: number = Date.now(),
): DailyScheduleShareResult | null {
  if (!last) return null;
  if (now - last.at >= DAILY_SCHEDULE_SHARE_TTL_MS) return null;
  return last.result;
}

export function rememberDailyScheduleShare(
  result: DailyScheduleShareResult,
  now: number = Date.now(),
): void {
  last = { at: now, result };
}

export function takeDailyScheduleInFlight(
  start: () => Promise<DailyScheduleShareResult>,
): Promise<DailyScheduleShareResult> {
  if (inFlight) return inFlight;
  inFlight = start().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function clearDailyScheduleShare(): void {
  inFlight = null;
  last = null;
}
