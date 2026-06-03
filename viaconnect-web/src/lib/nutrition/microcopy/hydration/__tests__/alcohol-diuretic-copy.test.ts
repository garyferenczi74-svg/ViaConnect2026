// Prompt 172e Phase C Workstream 3: alcohol diuretic threshold copy tests.
//
// Per spec section 5.3 and section 8.4:
//   - Normal mode surfaces a short factual note when the user has logged
//     alcohol above the daily threshold. The note never names the threshold
//     number itself (avoids implying medical advice).
//   - Safety mode strips the drink count and the threshold framing per
//     170c silent UX, matching Phase B's existing suppression of numbers.
//
// The strings must pass the clinical claim linter (the namespace sweep at
// clinical-claim-lint.test.ts catches them automatically). This file pins
// the human review surface (the verbatim strings) so Hannah and Kelsey
// can sign off on the exact copy without diff archaeology.

import { describe, it, expect } from 'vitest';
import { HYDRATION_MICROCOPY_STRINGS, getHydrationMicrocopy } from '..';

const NORMAL_KEY = 'hydration.alcohol.diuretic.threshold_note';

describe('Prompt 172e Phase C alcohol diuretic copy keys exist', () => {
  it('exposes the threshold_note key', () => {
    expect(HYDRATION_MICROCOPY_STRINGS[NORMAL_KEY]).toBeDefined();
  });

  it('threshold_note carries both variants (normal + safety_mode)', () => {
    const entry = HYDRATION_MICROCOPY_STRINGS[NORMAL_KEY];
    expect(typeof entry.normal).toBe('string');
    expect(typeof entry.safety_mode).toBe('string');
    expect(entry.normal.length).toBeGreaterThan(0);
    expect(entry.safety_mode.length).toBeGreaterThan(0);
  });
});

describe('Prompt 172e Phase C alcohol diuretic copy content guardrails', () => {
  it('normal variant references alcohol and hydration without naming the threshold number', () => {
    const text = getHydrationMicrocopy(NORMAL_KEY, 'normal');
    expect(text.toLowerCase()).toContain('alcohol');
    expect(text.toLowerCase()).toContain('hydration');
    // The threshold default is 3; the copy must not encode it (changing
    // the env-config later would otherwise drift the user facing copy).
    expect(text).not.toMatch(/\b3 drinks?\b/i);
    expect(text).not.toMatch(/threshold of \d+/i);
  });

  it('normal variant references a count placeholder so the caller can interpolate', () => {
    const text = getHydrationMicrocopy(NORMAL_KEY, 'normal');
    expect(text).toContain('{count}');
  });

  it('safety mode variant strips the count placeholder and any drink count framing', () => {
    const text = getHydrationMicrocopy(NORMAL_KEY, 'safety_mode');
    expect(text).not.toContain('{count}');
    expect(text.toLowerCase()).not.toContain('drinks today');
    expect(text.toLowerCase()).not.toContain('logged drinks');
  });

  it('neither variant prescribes behavior (no should / must / need to / avoid)', () => {
    for (const variant of ['normal', 'safety_mode'] as const) {
      const text = getHydrationMicrocopy(NORMAL_KEY, variant);
      expect(text.toLowerCase()).not.toMatch(/\byou should\b/);
      expect(text.toLowerCase()).not.toMatch(/\byou must\b/);
      expect(text.toLowerCase()).not.toMatch(/\byou need to\b/);
      expect(text.toLowerCase()).not.toMatch(/\bavoid drinking\b/);
    }
  });

  it('neither variant encourages or gamifies alcohol intake', () => {
    for (const variant of ['normal', 'safety_mode'] as const) {
      const text = getHydrationMicrocopy(NORMAL_KEY, variant);
      expect(text.toLowerCase()).not.toContain('great job');
      expect(text.toLowerCase()).not.toContain('streak');
      expect(text.toLowerCase()).not.toContain('enjoy');
      expect(text.toLowerCase()).not.toContain('treat yourself');
    }
  });

  it('neither variant contains em or en dashes', () => {
    const EM_DASH = String.fromCharCode(0x2014);
    const EN_DASH = String.fromCharCode(0x2013);
    for (const variant of ['normal', 'safety_mode'] as const) {
      const text = getHydrationMicrocopy(NORMAL_KEY, variant);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toContain(EN_DASH);
    }
  });
});
