/**
 * Prompt 219d: single pure computation for Daily Schedule counts and
 * adherence used by Dashboard TodaysProtocol and My Supplements DailySchedule.
 *
 * Slot assignment is NOT done here. Both surfaces must already hold a
 * ScheduleView from GET /api/supplements/schedule (Hannah + user slots).
 * This module only aggregates that view; it never re-classifies items.
 *
 * "Today" is defined solely by the schedule API (profiles.timezone via
 * localDateString on the server). Clients must not invent a second day key.
 */

import type { ScheduleCard, ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';

export const SCHEDULE_BUCKETS: readonly TimeOfDay[] = [
  'morning',
  'afternoon',
  'evening',
] as const;

export const EMPTY_SCHEDULE_VIEW: ScheduleView = {
  morning: [],
  afternoon: [],
  evening: [],
};

export interface DailyScheduleCounts {
  total: number;
  completed: number;
  adherencePercent: number;
  perSlot: Record<TimeOfDay, { total: number; completed: number }>;
}

/** Pure: counts and adherence from a ScheduleView. Fabricates nothing. */
export function computeDailyScheduleCounts(
  view: ScheduleView | null | undefined,
): DailyScheduleCounts {
  const perSlot: DailyScheduleCounts['perSlot'] = {
    morning: { total: 0, completed: 0 },
    afternoon: { total: 0, completed: 0 },
    evening: { total: 0, completed: 0 },
  };
  if (!view) {
    return { total: 0, completed: 0, adherencePercent: 0, perSlot };
  }
  let total = 0;
  let completed = 0;
  for (const b of SCHEDULE_BUCKETS) {
    const cards = view[b] ?? [];
    const slotTotal = cards.length;
    const slotDone = cards.filter((c) => c.taken).length;
    perSlot[b] = { total: slotTotal, completed: slotDone };
    total += slotTotal;
    completed += slotDone;
  }
  const adherencePercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, adherencePercent, perSlot };
}

/**
 * Local wall-clock bucket for "which column is now" UI only.
 * Must match DailySchedule.currentBucket and dashboard focus slot.
 * Does NOT assign supplements to slots (that is server ScheduleView only).
 */
export function currentLocalScheduleBucket(
  now: Date = new Date(),
): TimeOfDay {
  const h = now.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/** Flatten all cards in stable bucket order (for tests / parity). */
export function flattenScheduleCards(view: ScheduleView): ScheduleCard[] {
  const out: ScheduleCard[] = [];
  for (const b of SCHEDULE_BUCKETS) {
    out.push(...(view[b] ?? []));
  }
  return out;
}

/**
 * Optimistic taken toggle on a ScheduleView (pure). Used by both surfaces
 * so local UI stays in sync before the shared POST settles.
 */
export function setScheduleCardTaken(
  view: ScheduleView,
  slotId: string,
  taken: boolean,
): ScheduleView {
  const next: ScheduleView = { morning: [], afternoon: [], evening: [] };
  for (const b of SCHEDULE_BUCKETS) {
    next[b] = (view[b] ?? []).map((c) =>
      c.slot_id === slotId ? { ...c, taken } : c,
    );
  }
  return next;
}
