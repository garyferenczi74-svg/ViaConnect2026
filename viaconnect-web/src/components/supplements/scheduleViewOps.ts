// Pure helpers for the Daily Schedule optimistic remove + undo. Framework-free
// so they are unit-testable. No emojis. No em or en dashes.

import type { ScheduleCard, ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';
const BUCKETS: TimeOfDay[] = ['morning', 'afternoon', 'evening'];

// Remove every card belonging to one supplement (it may span buckets) and
// return both the pruned view and the removed cards (so an Undo can restore them).
export function removeSupplementFromView(
  view: ScheduleView,
  userSupplementId: string,
): { next: ScheduleView; removed: ScheduleCard[] } {
  const next: ScheduleView = { morning: [], afternoon: [], evening: [] };
  const removed: ScheduleCard[] = [];
  for (const b of BUCKETS) {
    for (const c of view[b]) {
      if (c.user_supplement_id === userSupplementId) removed.push(c);
      else next[b].push(c);
    }
  }
  return { next, removed };
}

// Re-insert removed cards into their original buckets, restoring display_order.
export function restoreSupplementToView(view: ScheduleView, removed: ScheduleCard[]): ScheduleView {
  const next: ScheduleView = {
    morning: [...view.morning],
    afternoon: [...view.afternoon],
    evening: [...view.evening],
  };
  for (const c of removed) next[c.time_of_day].push(c);
  for (const b of BUCKETS) next[b].sort((a, b2) => a.display_order - b2.display_order);
  return next;
}
