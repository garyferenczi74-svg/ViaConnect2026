/**
 * Prompt 219 / 219a: compact Daily Schedule rows that size to content.
 * 219a: min-height 56px, height auto; no max-height / clipping overflow.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Prompt 219a content-sized schedule rows', () => {
  it('ScheduleSupplementCard is content-height row with testid and Card surface', () => {
    const src = readFileSync(
      join(root, 'src/components/supplements/ScheduleSupplementCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/schedule-compact-row/);
    expect(src).toMatch(/min-h-\[56px\]/);
    expect(src).toMatch(/h-auto/);
    // 219a: never clamp row height (fixed / max-height caused clipping)
    expect(src).not.toMatch(/max-h-\[80px\]/);
    expect(src).not.toMatch(/max-h-\[/);
    // Row root uses h-auto + min-h only (no fixed h-[NNpx] on the row class)
    expect(src).toMatch(
      /schedule-compact-row[\s\S]*?className=\{`[^`]*h-auto min-h-\[56px\]/,
    );
    expect(src).toMatch(/overflow-visible/);
    expect(src).toMatch(/30,48,84|1E3054/i);
    expect(src).toMatch(/break-words/);
    // Brief 34: word wrap on the name class, never letter wrap.
    const nameClass = src.match(
      /data-testid="schedule-row-name"[\s\S]*?className=\{`([^`]+)`/,
    )?.[1] ?? '';
    expect(nameClass).not.toMatch(/overflow-wrap:anywhere|overflow-wrap: anywhere|\[overflow-wrap:anywhere\]/);
    expect(nameClass).toMatch(/overflow-wrap:break-word|\[overflow-wrap:break-word\]/);
    expect(src).not.toMatch(/line-clamp-/);
    // No Tailwind truncate utility on name/dose classes (comment text may say "truncate")
    expect(src).not.toMatch(/className=\{`[^`]*\btruncate\b/);
    expect(src).not.toMatch(/className="[^"]*\btruncate\b/);
    expect(src).not.toMatch(/pb-7/);
    expect(src).not.toMatch(/absolute bottom-1 right-1/);
  });

  it('chips render inside the row under dose with wrap', () => {
    const src = readFileSync(
      join(root, 'src/components/supplements/ScheduleSupplementCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/schedule-row-chips/);
    expect(src).toMatch(/With food/);
    expect(src).toMatch(/Fat soluble/);
    expect(src).toMatch(/flex-wrap/);
    // Chips are not absolutely positioned outside the row
    expect(src).not.toMatch(/absolute.*Chip|Chip.*absolute/);
  });

  it('controls self-center to variable row height', () => {
    const src = readFileSync(
      join(root, 'src/components/supplements/ScheduleSupplementCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/items-center/);
    expect(src).toMatch(/self-center/);
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
