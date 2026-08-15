/**
 * Prompt 219: compact Daily Schedule row contracts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Prompt 219 compact schedule rows', () => {
  it('ScheduleSupplementCard is compact row with testid and Card surface', () => {
    const src = readFileSync(
      join(root, 'src/components/supplements/ScheduleSupplementCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/schedule-compact-row/);
    expect(src).toMatch(/min-h-\[56px\]/);
    expect(src).toMatch(/max-h-\[80px\]/);
    expect(src).toMatch(/30,48,84|1E3054/i);
    expect(src).toMatch(/break-words/);
    expect(src).not.toMatch(/pb-7/);
    expect(src).not.toMatch(/absolute bottom-1 right-1/);
  });

  it('DailySchedule uses 8px gap (gap-2) and DraggableScheduleCard only', () => {
    const src = readFileSync(
      join(root, 'src/components/supplements/DailySchedule.tsx'),
      'utf8',
    );
    expect(src).toMatch(/flex flex-col gap-2/);
    expect(src).toMatch(/DraggableScheduleCard/);
    // No second large-card component mount on this page
    expect(src).not.toMatch(/ScheduleSupplementCard/);
    expect((src.match(/<DraggableScheduleCard/g) ?? []).length).toBe(2);
  });

  it('DraggableScheduleCard still wraps ScheduleSupplementCard (shared row)', () => {
    const src = readFileSync(
      join(root, 'src/components/supplements/DraggableScheduleCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/ScheduleSupplementCard/);
  });

  it('action targets meet 44px on compact actions', () => {
    const card = readFileSync(
      join(root, 'src/components/supplements/ScheduleSupplementCard.tsx'),
      'utf8',
    );
    const move = readFileSync(
      join(root, 'src/components/supplements/MoveToMenu.tsx'),
      'utf8',
    );
    const peek = readFileSync(
      join(root, 'src/components/supplements/RationalePeek.tsx'),
      'utf8',
    );
    expect(card).toMatch(/min-h-\[44px\]/);
    expect(move).toMatch(/min-h-\[44px\]/);
    expect(peek).toMatch(/min-h-\[44px\]/);
  });
});
