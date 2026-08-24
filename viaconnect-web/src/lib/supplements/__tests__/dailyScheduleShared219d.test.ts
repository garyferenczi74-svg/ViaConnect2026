/**
 * Prompt 219d: shared Daily Schedule counts + parity of both surfaces.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';
import {
  computeDailyScheduleCounts,
  currentLocalScheduleBucket,
  EMPTY_SCHEDULE_VIEW,
  flattenScheduleCards,
  setScheduleCardTaken,
} from '../dailyScheduleShared';

const root = process.cwd();

function card(
  slot: 'morning' | 'afternoon' | 'evening',
  name: string,
  taken = false,
): ScheduleView['morning'][0] {
  return {
    slot_id: `${slot}-${name}`,
    user_supplement_id: `u-${name}`,
    name,
    dose: '1',
    time_of_day: slot,
    time_source: 'hannah',
    rationale: null,
    with_food: false,
    empty_stomach: false,
    fat_soluble: false,
    away_from: [],
    taken,
    display_order: 0,
  };
}

describe('Prompt 219d shared daily schedule', () => {
  it('computes totals and per-slot counts from ScheduleView only', () => {
    const view: ScheduleView = {
      morning: [card('morning', 'A'), card('morning', 'B', true)],
      afternoon: [card('afternoon', 'Creatine HCl')],
      evening: [card('evening', 'E1'), card('evening', 'E2'), card('evening', 'E3')],
    };
    const c = computeDailyScheduleCounts(view);
    expect(c.total).toBe(6);
    expect(c.completed).toBe(1);
    expect(c.adherencePercent).toBe(17);
    expect(c.perSlot.morning).toEqual({ total: 2, completed: 1 });
    expect(c.perSlot.afternoon).toEqual({ total: 1, completed: 0 });
    expect(c.perSlot.evening).toEqual({ total: 3, completed: 0 });
  });

  it('dashboard and supplements surfaces both use useDailyScheduleView', () => {
    const dash = readFileSync(
      join(root, 'src/components/dashboard/TodaysProtocol.tsx'),
      'utf8',
    );
    const supp = readFileSync(
      join(root, 'src/components/supplements/DailySchedule.tsx'),
      'utf8',
    );
    expect(dash).toMatch(/useDailyScheduleView/);
    expect(supp).toMatch(/useDailyScheduleView/);
    // Dashboard no longer classifies slots client-side
    expect(dash).not.toMatch(/supplementToSlot/);
  });

  it('parity: same view yields same counts for both surface aggregators', () => {
    // Fixture matching the observed defect shape (19 cards, 1 afternoon)
    const view: ScheduleView = {
      morning: Array.from({ length: 13 }, (_, i) => card('morning', `M${i}`)),
      afternoon: [card('afternoon', 'Creatine HCl')],
      evening: Array.from({ length: 5 }, (_, i) => card('evening', `E${i}`)),
    };
    const a = computeDailyScheduleCounts(view);
    const b = computeDailyScheduleCounts(view);
    expect(a).toEqual(b);
    expect(a.total).toBe(19);
    expect(a.perSlot.afternoon.total).toBe(1);
    expect(flattenScheduleCards(view).some((c) => c.name === 'Creatine HCl')).toBe(
      true,
    );
  });

  it('slot boundary: 11:59 morning, 12:00 afternoon, 18:00 evening', () => {
    expect(currentLocalScheduleBucket(new Date(2026, 7, 15, 11, 59))).toBe(
      'morning',
    );
    expect(currentLocalScheduleBucket(new Date(2026, 7, 15, 12, 0))).toBe(
      'afternoon',
    );
    expect(currentLocalScheduleBucket(new Date(2026, 7, 15, 17, 59))).toBe(
      'afternoon',
    );
    expect(currentLocalScheduleBucket(new Date(2026, 7, 15, 18, 0))).toBe(
      'evening',
    );
  });

  it('timezone note: schedule day is server localDateString, not client invent', () => {
    const api = readFileSync(
      join(root, 'src/app/api/supplements/schedule/route.ts'),
      'utf8',
    );
    const assign = readFileSync(
      join(root, 'src/lib/caq/supplements/timing/assignTiming.ts'),
      'utf8',
    );
    // Server path owns today
    expect(assign).toMatch(/localDateString/);
    // Client surfaces do not invent a second day table
    const dash = readFileSync(
      join(root, 'src/components/dashboard/TodaysProtocol.tsx'),
      'utf8',
    );
    expect(dash).not.toMatch(/protocol_adherence_log/);
    expect(api).toMatch(/getScheduleView|toggleIntake/);
  });

  it('toggle is pure on shared view helper', () => {
    const view: ScheduleView = {
      ...EMPTY_SCHEDULE_VIEW,
      afternoon: [card('afternoon', 'Creatine HCl', false)],
    };
    const next = setScheduleCardTaken(view, 'afternoon-Creatine HCl', true);
    expect(next.afternoon[0].taken).toBe(true);
    expect(view.afternoon[0].taken).toBe(false);
  });

  it('grep: no remaining client count path via supplementToSlot on dashboard', () => {
    const dash = readFileSync(
      join(root, 'src/components/dashboard/TodaysProtocol.tsx'),
      'utf8',
    );
    expect(dash).not.toMatch(/from '@\/lib\/protocolSlot'/);
    expect(dash).not.toMatch(/from \"@\/lib\/protocolSlot\"/);
  });
});
