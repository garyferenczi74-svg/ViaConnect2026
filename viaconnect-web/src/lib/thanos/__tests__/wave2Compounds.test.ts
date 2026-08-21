import { describe, expect, it } from 'vitest';
import { WAVE1_COMPOUNDS } from '../wave1Compounds';
import { WAVE1_SLUG_SET } from '../wave2Compounds';

describe('Prompt 225a Wave 2 compound exclusion', () => {
  it('Wave 1 slug set covers every Wave 1 compound', () => {
    expect(WAVE1_SLUG_SET.size).toBe(WAVE1_COMPOUNDS.length);
    for (const c of WAVE1_COMPOUNDS) {
      expect(WAVE1_SLUG_SET.has(c.slug)).toBe(true);
    }
  });

  it('does not treat Wave 1 flagships as Wave 2 eligible by slug set', () => {
    expect(WAVE1_SLUG_SET.has('edu-bpc157')).toBe(true);
    expect(WAVE1_SLUG_SET.has('retatrutide')).toBe(true);
  });
});
