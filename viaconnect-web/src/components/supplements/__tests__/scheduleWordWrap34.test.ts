/**
 * Brief 34: Daily Schedule names wrap as words, never one glyph per line.
 * Source-presence + layout contract. Existing take / drag / move / remove
 * wiring stays unchanged. No emojis. No em or en dashes.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScheduleSupplementCard } from '../ScheduleSupplementCard';
import type { ScheduleCard } from '@/lib/caq/supplements/timing/assignTiming';

const COMPONENTS = join(__dirname, '..');

const LETTER_LADDER = [
  /overflow-wrap\s*:\s*anywhere/,
  /\[overflow-wrap:anywhere\]/,
  /word-break\s*:\s*break-all/,
  /break-all/,
  /writing-mode/,
  /1ch/,
];

function cardSrc(): string {
  return readFileSync(join(COMPONENTS, 'ScheduleSupplementCard.tsx'), 'utf8');
}

function dragSrc(): string {
  return readFileSync(join(COMPONENTS, 'DraggableScheduleCard.tsx'), 'utf8');
}

function scheduleSrc(): string {
  return readFileSync(join(COMPONENTS, 'DailySchedule.tsx'), 'utf8');
}

function nameClassFrom(src: string): string {
  const match = src.match(
    /data-testid="schedule-row-name"[\s\S]*?className=\{`([^`]+)`/,
  );
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

function fixtureCard(overrides: Partial<ScheduleCard> = {}): ScheduleCard {
  return {
    slot_id: 'slot-liposomal-d',
    user_supplement_id: 'supp-liposomal-d',
    name: 'Liposomal Vitamin D',
    dose: '500mg',
    time_of_day: 'morning',
    time_source: 'hannah',
    rationale: null,
    with_food: true,
    empty_stomach: false,
    fat_soluble: true,
    away_from: [],
    taken: false,
    display_order: 0,
    ...overrides,
  };
}

function renderCard(overrides: Partial<ScheduleCard> = {}): string {
  return renderToStaticMarkup(
    React.createElement(ScheduleSupplementCard, {
      card: fixtureCard(overrides),
      taken: false,
      onToggle: () => undefined,
      onMove: () => undefined,
      onRemove: () => undefined,
    }),
  );
}

describe('Brief 34 word wrap (source presence)', () => {
  it('name class does not letter-stack (no anywhere, break-all, writing-mode, or 1ch)', () => {
    const nameClass = nameClassFrom(cardSrc());
    for (const banned of LETTER_LADDER) {
      expect(nameClass).not.toMatch(banned);
    }
    expect(cardSrc()).not.toMatch(/writing-mode\s*:\s*vertical/);
    expect(cardSrc()).not.toMatch(/w-\[1ch\]|width:\s*1ch/);
  });

  it('name uses word wrap (break-words or overflow-wrap:break-word) and word-break:normal', () => {
    const nameClass = nameClassFrom(cardSrc());
    expect(nameClass).toMatch(/break-words|overflow-wrap:break-word|\[overflow-wrap:break-word\]/);
    expect(nameClass).toMatch(/\[word-break:normal\]/);
    expect(nameClass).not.toMatch(/truncate|line-clamp-/);
  });

  it('row is one flex row with checkbox + name + dose (dose is not a stacked second line under the name)', () => {
    const src = cardSrc();
    expect(src).toMatch(
      /schedule-compact-row[\s\S]*?className=\{`[^`]*\bflex\b[^`]*items-center/,
    );
    expect(src).not.toMatch(/schedule-compact-row[\s\S]*?className=\{`[^`]*flex-col/);
    expect(src).toContain('data-testid="schedule-row-name"');
    expect(src).toContain('data-testid="schedule-row-dose"');
    expect(src).toContain('aria-pressed={taken}');
    // Dose is a sibling of the name column, not a second <p> inside it.
    const nameBlock = src.slice(
      src.indexOf('data-testid="schedule-row-name"'),
      src.indexOf('data-testid="schedule-row-dose"'),
    );
    expect(nameBlock).toContain('{card.name}');
    expect(nameBlock).not.toContain('{card.dose}');
    expect(src).toMatch(/data-testid="schedule-row-dose"[\s\S]*?\{card\.dose\}/);
  });

  it('card and motion wrapper take the column width (w-full + min-w-0)', () => {
    expect(cardSrc()).toMatch(
      /schedule-compact-row[\s\S]*?className=\{`[^`]*\bw-full\b[^`]*\bmin-w-0\b/,
    );
    const drag = dragSrc();
    expect(drag).toMatch(/className="[^"]*\bw-full\b[^"]*\bmin-w-0\b/);
    expect(scheduleSrc()).toMatch(/min-w-0 flex flex-col gap-2/);
    expect(scheduleSrc()).toMatch(/flex min-w-0 flex-col overflow-hidden/);
  });

  it('chip labels wrap as words, not glyphs', () => {
    const src = cardSrc();
    expect(src).toContain('With food');
    expect(src).toContain('Fat soluble');
    expect(src).not.toMatch(/Chip[\s\S]{0,400}overflow-wrap:anywhere/);
    expect(src).not.toMatch(/Chip[\s\S]{0,400}break-all/);
    expect(src).toMatch(
      /Chip[\s\S]*?break-words \[overflow-wrap:break-word\] \[word-break:normal\]/,
    );
  });

  it('take, drag, move, and remove wiring is unchanged', () => {
    const card = cardSrc();
    const drag = dragSrc();
    const schedule = scheduleSrc();

    expect(card).toContain('onToggle');
    expect(card).toContain('aria-pressed={taken}');
    expect(card).toContain('data-drag-handle');
    expect(card).toContain('onHandlePointerDown');
    expect(card).toContain('onMove');
    expect(card).toContain('MoveToMenu');
    expect(card).toContain('onRemove');
    expect(card).toContain('aria-label={`Remove ${card.name} from your schedule`}');

    expect(drag).toContain('dragControls');
    expect(drag).toContain('controls.start');
    expect(drag).toContain('onCardDragEnd');
    expect(drag).toContain('ScheduleSupplementCard');

    expect(schedule).toContain('handleToggle');
    expect(schedule).toContain('handleMove');
    expect(schedule).toContain('handleRemove');
    expect(schedule).toContain('onCardDragEnd');
    expect((schedule.match(/<DraggableScheduleCard/g) ?? []).length).toBe(2);
  });
});

describe('Brief 34 fixture strings stay horizontal words', () => {
  it('renders Liposomal Vitamin D and 500mg as contiguous words, not letter-stacked', () => {
    const html = renderCard();
    expect(html).toMatch(/data-testid="schedule-row-name"[^>]*>Liposomal Vitamin D</);
    expect(html).toMatch(/data-testid="schedule-row-dose"[^>]*>500mg</);
    expect(html).toContain('With food');
    expect(html).toContain('Fat soluble');

    const nameMatch = html.match(
      /data-testid="schedule-row-name" class="([^"]*)">Liposomal Vitamin D</,
    );
    expect(nameMatch).not.toBeNull();
    const nameClass = nameMatch?.[1] ?? '';
    expect(nameClass).toMatch(/break-words|overflow-wrap:break-word/);
    expect(nameClass).not.toMatch(/anywhere|break-all|writing-mode|1ch/);

    const chipBlock = html.match(
      /data-testid="schedule-row-chips"[\s\S]*?(?=<p data-testid="schedule-row-dose"|$)/,
    )?.[0] ?? '';
    expect(chipBlock).toContain('With food');
    expect(chipBlock).toContain('Fat soluble');
    expect(chipBlock).not.toMatch(/W<\/|>W</);
  });

  it('renders Organika Glycine as a contiguous name with dose on the same row', () => {
    const html = renderCard({
      name: 'Organika Glycine',
      dose: '500mg',
      slot_id: 'slot-glycine',
      user_supplement_id: 'supp-glycine',
      with_food: false,
      fat_soluble: false,
    });
    expect(html).toMatch(/data-testid="schedule-row-name"[^>]*>Organika Glycine</);
    expect(html).toMatch(/data-testid="schedule-row-dose"[^>]*>500mg</);
    expect(html).toMatch(
      /data-testid="schedule-compact-row"[^>]*\bflex\b[^>]*\bw-full\b[^>]*\bmin-w-0\b/,
    );
    expect(html).not.toMatch(/>O</);
    expect(html).not.toMatch(/O<\/span>r<\/span>/);
  });
});
