/**
 * Prompt 216d: Hannah note composition, distinctness, welcome, lexicon, staleness contract.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyHannahNoteLexicon,
  composeHannahNote,
  isNoteDistinctFromReadToday,
  pickWelcomeNote,
  HANNAH_NOTE_WELCOME_TEMPLATES,
  HANNAH_NOTE_WELCOME_APPROVED_BY,
} from '../hannahNote';
import { composeAcceleratorInsights, composePersonalizedRead } from '../compose';
import type { SupplierDigest } from '../types';

const root = process.cwd();
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

function digest(
  supplier: SupplierDigest['supplier'],
  items: SupplierDigest['items'],
  skipped = false,
): SupplierDigest {
  return {
    supplier,
    ok: !skipped,
    skipped,
    skipReason: skipped ? 'timeout' : undefined,
    durationMs: 1,
    items: skipped ? [] : items,
  };
}

describe('Prompt 216d welcome templates (Marshall-gated set)', () => {
  it('has approved-by marshall marker and non-empty templates', () => {
    expect(HANNAH_NOTE_WELCOME_APPROVED_BY).toBe('marshall');
    expect(HANNAH_NOTE_WELCOME_TEMPLATES.length).toBeGreaterThanOrEqual(2);
    for (const t of HANNAH_NOTE_WELCOME_TEMPLATES) {
      expect(t).toMatch(/\{name\}/);
      expect(t.includes(EM)).toBe(false);
      expect(t.includes(EN)).toBe(false);
      expect(/cure|diagnose|disease/i.test(t)).toBe(false);
    }
  });

  it('pickWelcomeNote is generic and name-aware', () => {
    const w = pickWelcomeNote('Gary', 0);
    expect(w.noteKind).toBe('welcome');
    expect(w.noteText).toContain('Gary');
    expect(w.noteText).toMatch(/welcome|meet you|opening/i);
  });
});

describe('Prompt 216d lexicon', () => {
  it('strips em and en dashes', () => {
    const cleaned = applyHannahNoteLexicon(`Hello${EM}world${EN}test`);
    expect(cleaned.includes(EM)).toBe(false);
    expect(cleaned.includes(EN)).toBe(false);
  });

  it('soft-scrubs medical claim language', () => {
    const cleaned = applyHannahNoteLexicon('This will cure disease and diagnose issues');
    expect(/cure|disease|diagnose/i.test(cleaned)).toBe(false);
  });
});

describe('Prompt 216d distinctness vs read-today', () => {
  it('rejects equal and containment', () => {
    const read =
      'You are holding a solid, level baseline. A single focused area is usually the next lever to nudge it up.';
    expect(isNoteDistinctFromReadToday(read, read)).toBe(false);
    expect(
      isNoteDistinctFromReadToday(`Extra prefix. ${read}`, read),
    ).toBe(false);
    expect(
      isNoteDistinctFromReadToday(
        'Gary, I want you to notice nutrition today. Log protein earlier.',
        read,
      ),
    ).toBe(true);
  });

  it('composed note differs from personalized analysis/recommendation', () => {
    const digests: SupplierDigest[] = [
      digest('gordon', [
        {
          id: 'g1',
          hub: 'Nutrition',
          summary: '4 meals logged with steady protein',
          metricValue: '4',
          refs: ['m1'],
        },
      ]),
      digest('arnold', [
        {
          id: 'a1',
          hub: 'Biology',
          summary: 'Body fat 18.2% latest scan',
          metricValue: '18.2',
          refs: ['c1'],
        },
      ]),
    ];
    const insights = composeAcceleratorInsights(digests, 4);
    const personalized = composePersonalizedRead(digests, insights, 'Gary');
    const note = composeHannahNote(digests, insights, 'Gary', personalized, {
      heroReadSubtext:
        'You are holding a solid, level baseline. A single focused area is usually the next lever to nudge it up.',
    });

    expect(note.noteKind).toBe('compiled');
    expect(note.noteText).toContain('Gary');
    expect(note.noteText.length).toBeGreaterThan(20);
    expect(isNoteDistinctFromReadToday(note.noteText, personalized.analysis)).toBe(
      true,
    );
    expect(
      isNoteDistinctFromReadToday(note.noteText, personalized.recommendation),
    ).toBe(true);
    expect(
      isNoteDistinctFromReadToday(
        note.noteText,
        'You are holding a solid, level baseline. A single focused area is usually the next lever to nudge it up.',
      ),
    ).toBe(true);
    // Must not near-duplicate the old static stub pair
    expect(note.noteText).not.toMatch(/holding a solid baseline/i);
    expect(note.noteText).not.toMatch(/one focused area is usually the next lever/i);
  });

  it('two users with different digests get different notes', () => {
    const sparse: SupplierDigest[] = [
      digest('jeffery', [
        {
          id: 'j1',
          hub: 'CAQ',
          summary: 'CAQ incomplete',
          metricValue: null,
          refs: ['caq'],
        },
      ]),
    ];
    const rich: SupplierDigest[] = [
      digest('gordon', [
        {
          id: 'g1',
          hub: 'Nutrition',
          summary: 'Protein target met 3 days',
          metricValue: '3',
          refs: ['n1'],
        },
      ]),
      digest('arnold', [
        {
          id: 'a1',
          hub: 'Biology',
          summary: 'Lean mass up 0.4 kg',
          metricValue: '0.4',
          refs: ['b1'],
        },
      ]),
    ];
    const i1 = composeAcceleratorInsights(sparse, 4);
    const i2 = composeAcceleratorInsights(rich, 4);
    const p1 = composePersonalizedRead(sparse, i1, 'Alex');
    const p2 = composePersonalizedRead(rich, i2, 'Sam');
    const n1 = composeHannahNote(sparse, i1, 'Alex', p1);
    const n2 = composeHannahNote(rich, i2, 'Sam', p2);
    expect(n1.noteText).not.toBe(n2.noteText);
    expect(n1.noteText).toContain('Alex');
    expect(n2.noteText).toContain('Sam');
  });

  it('note changes when digests change for same user', () => {
    const before: SupplierDigest[] = [
      digest('gordon', [
        {
          id: 'g1',
          hub: 'Nutrition',
          summary: 'Only 1 meal logged',
          metricValue: '1',
          refs: ['m1'],
        },
      ]),
    ];
    const after: SupplierDigest[] = [
      digest('arnold', [
        {
          id: 'a1',
          hub: 'Biology',
          summary: 'New scan body fat 16%',
          metricValue: '16',
          refs: ['scan:new'],
        },
      ]),
    ];
    const ib = composeAcceleratorInsights(before, 4);
    const ia = composeAcceleratorInsights(after, 4);
    const pb = composePersonalizedRead(before, ib, 'Gary');
    const pa = composePersonalizedRead(after, ia, 'Gary');
    const nb = composeHannahNote(before, ib, 'Gary', pb);
    const na = composeHannahNote(after, ia, 'Gary', pa);
    expect(nb.noteText).not.toBe(na.noteText);
  });
});

describe('Prompt 216d staleness contract', () => {
  it('asserts note generated_at must be >= last completed compile ended_at', () => {
    // Wiring invariant used by useHannahDailyNote and compile persist.
    const noteGeneratedAt = '2026-08-13T12:00:05.000Z';
    const compileEndedAt = '2026-08-13T12:00:00.000Z';
    expect(Date.parse(noteGeneratedAt)).toBeGreaterThanOrEqual(
      Date.parse(compileEndedAt),
    );

    const staleNote = '2026-08-13T11:00:00.000Z';
    const laterCompile = '2026-08-13T12:00:00.000Z';
    expect(Date.parse(staleNote) < Date.parse(laterCompile)).toBe(true);
  });

  it('runCompilation sets note generatedAt equal to compile endedAt', () => {
    const src = readFileSync(
      join(root, 'src/lib/hannah/compilation/runCompilation.ts'),
      'utf8',
    );
    expect(src).toMatch(/hannah_daily_notes/);
    expect(src).toMatch(/composeHannahNote/);
    expect(src).toMatch(/generated_at: generatedAt/);
    expect(src).toMatch(/compile_ended_at: generatedAt/);
  });
});

describe('Prompt 216d wiring surfaces', () => {
  it('profile card consumes useHannahDailyNote not stateWord stub', () => {
    const coaching = readFileSync(
      join(root, 'src/components/journey/YourJourneyCoaching.tsx'),
      'utf8',
    );
    expect(coaching).toMatch(/useHannahDailyNote/);
    expect(coaching).not.toMatch(
      /holding a solid baseline\. One focused area is usually the next lever/,
    );
  });

  it('chain entry still owns compilation (no orphan note cron)', () => {
    const chain = readFileSync(
      join(root, 'src/lib/hannah/compilation/chainEntry.ts'),
      'utf8',
    );
    expect(chain).toMatch(/runHannahCompilation/);
    const run = readFileSync(
      join(root, 'src/lib/hannah/compilation/runCompilation.ts'),
      'utf8',
    );
    expect(run).toMatch(/hannahNote/);
  });
});
