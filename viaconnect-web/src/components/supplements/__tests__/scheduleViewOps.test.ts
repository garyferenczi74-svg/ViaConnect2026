// Tests for the Daily Schedule remove + undo pure helpers and the source
// contracts that wire the trash control end to end. No emojis. No dashes.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { removeSupplementFromView, restoreSupplementToView } from '../scheduleViewOps';
import type { ScheduleCard, ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

// Minimal factory: only the fields the pure helpers read, cast as ScheduleCard.
function card(
  userSupplementId: string,
  timeOfDay: TimeOfDay,
  slotId: string,
  displayOrder: number,
): ScheduleCard {
  return {
    user_supplement_id: userSupplementId,
    time_of_day: timeOfDay,
    slot_id: slotId,
    display_order: displayOrder,
  } as unknown as ScheduleCard;
}

function emptyView(): ScheduleView {
  return { morning: [], afternoon: [], evening: [] };
}

function slotIds(cards: ScheduleCard[]): string[] {
  return cards.map((c) => c.slot_id);
}

const COMPONENTS_DIR = join(__dirname, '..');
const ROOT = join(__dirname, '..', '..', '..', '..');

describe('removeSupplementFromView', () => {
  it('removes every card sharing a user_supplement_id across buckets', () => {
    const view: ScheduleView = {
      morning: [card('supp-A', 'morning', 'slot-1', 0), card('supp-B', 'morning', 'slot-2', 1)],
      afternoon: [card('supp-C', 'afternoon', 'slot-3', 0)],
      evening: [card('supp-A', 'evening', 'slot-4', 0)],
    };

    const { next, removed } = removeSupplementFromView(view, 'supp-A');

    expect(removed).toHaveLength(2);
    expect(slotIds(removed).sort()).toEqual(['slot-1', 'slot-4']);
    // supp-A is gone from both morning and evening.
    expect(next.morning.some((c) => c.user_supplement_id === 'supp-A')).toBe(false);
    expect(next.evening.some((c) => c.user_supplement_id === 'supp-A')).toBe(false);
    // Other supplements untouched.
    expect(slotIds(next.morning)).toEqual(['slot-2']);
    expect(slotIds(next.afternoon)).toEqual(['slot-3']);
    expect(next.evening).toHaveLength(0);
  });

  it('returns an empty removed list when the supplement is absent', () => {
    const view: ScheduleView = {
      morning: [card('supp-A', 'morning', 'slot-1', 0)],
      afternoon: [],
      evening: [],
    };
    const { next, removed } = removeSupplementFromView(view, 'supp-Z');
    expect(removed).toHaveLength(0);
    expect(slotIds(next.morning)).toEqual(['slot-1']);
  });
});

describe('restoreSupplementToView', () => {
  it('re-inserts removed cards into their original buckets sorted by display_order', () => {
    const pruned: ScheduleView = {
      morning: [card('supp-B', 'morning', 'slot-keep', 1)],
      afternoon: [],
      evening: [],
    };
    const removed = [
      card('supp-A', 'morning', 'slot-late', 2),
      card('supp-A', 'morning', 'slot-early', 0),
    ];

    const restored = restoreSupplementToView(pruned, removed);

    // Sorted by display_order: slot-early (0), slot-keep (1), slot-late (2).
    expect(slotIds(restored.morning)).toEqual(['slot-early', 'slot-keep', 'slot-late']);
  });
});

describe('remove then restore round trip', () => {
  it('yields a view equivalent to the original (same slot ids per bucket in order)', () => {
    const view: ScheduleView = {
      morning: [card('supp-A', 'morning', 'slot-1', 0), card('supp-B', 'morning', 'slot-2', 1)],
      afternoon: [card('supp-C', 'afternoon', 'slot-3', 0)],
      evening: [card('supp-A', 'evening', 'slot-4', 0)],
    };

    const { next, removed } = removeSupplementFromView(view, 'supp-A');
    const restored = restoreSupplementToView(next, removed);

    expect(slotIds(restored.morning)).toEqual(slotIds(view.morning));
    expect(slotIds(restored.afternoon)).toEqual(slotIds(view.afternoon));
    expect(slotIds(restored.evening)).toEqual(slotIds(view.evening));
  });
});

describe('source contracts', () => {
  it('ScheduleSupplementCard imports Trash2, has onRemove, and the remove aria-label', () => {
    const src = readFileSync(join(COMPONENTS_DIR, 'ScheduleSupplementCard.tsx'), 'utf8');
    expect(src).toContain('Trash2');
    expect(src).toContain('onRemove');
    expect(src).toContain('aria-label={`Remove ${card.name} from your schedule`}');
  });

  it('route.ts handles remove and restore actions and imports setSupplementCurrent', () => {
    const src = readFileSync(join(ROOT, 'src', 'app', 'api', 'supplements', 'schedule', 'route.ts'), 'utf8');
    expect(src).toContain('setSupplementCurrent');
    expect(src).toContain("action === 'remove'");
    expect(src).toContain("action === 'restore'");
  });

  it('assignTiming exports setSupplementCurrent and updates is_current', () => {
    const src = readFileSync(join(ROOT, 'src', 'lib', 'caq', 'supplements', 'timing', 'assignTiming.ts'), 'utf8');
    expect(src).toContain('export async function setSupplementCurrent');
    expect(src).toContain('is_current');
  });

  it('DailySchedule wires handleRemove with remove/restore actions and an Undo label', () => {
    const src = readFileSync(join(COMPONENTS_DIR, 'DailySchedule.tsx'), 'utf8');
    expect(src).toContain('handleRemove');
    expect(src).toContain("action: 'remove'");
    expect(src).toContain("action: 'restore'");
    expect(src).toContain('Undo');
  });
});
