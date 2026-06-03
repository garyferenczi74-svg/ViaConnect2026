// Prompt 172e Phase D Workstream 3: ElectrolyteSummary safety mode contract.
//
// Spec section 8: "Suppressed numerically in safety mode." This suite
// proves the microcopy variant strips numerics. Rendering tests live
// downstream as integration tests; this suite pins the string contract
// the component reads against the canonical microcopy map.

import { describe, it, expect } from 'vitest';
import { HYDRATION_MICROCOPY_STRINGS } from '@/lib/nutrition/microcopy/hydration';

describe('Prompt 172e Phase D electrolyte summary microcopy', () => {
  it('normal variant interpolates sodium, potassium, magnesium placeholders', () => {
    const normal = HYDRATION_MICROCOPY_STRINGS['hydration.electrolytes.summary'].normal;
    expect(normal).toContain('{sodium}');
    expect(normal).toContain('{potassium}');
    expect(normal).toContain('{magnesium}');
    expect(normal).toContain('mg sodium');
    expect(normal).toContain('mg potassium');
    expect(normal).toContain('mg magnesium');
  });

  it('safety mode variant strips numeric placeholders + units', () => {
    const safety = HYDRATION_MICROCOPY_STRINGS['hydration.electrolytes.summary'].safety_mode;
    expect(safety).not.toContain('{sodium}');
    expect(safety).not.toContain('{potassium}');
    expect(safety).not.toContain('{magnesium}');
    expect(safety).not.toMatch(/\d+\s*mg/);
    expect(safety).not.toContain('mg');
  });

  it('safety mode variant contains no numerals', () => {
    const safety = HYDRATION_MICROCOPY_STRINGS['hydration.electrolytes.summary'].safety_mode;
    expect(safety).not.toMatch(/\d/);
  });

  it('safety mode variant is not empty (passes lint sweep entry not empty check)', () => {
    const safety = HYDRATION_MICROCOPY_STRINGS['hydration.electrolytes.summary'].safety_mode;
    expect(safety.length).toBeGreaterThan(0);
  });
});

describe('Prompt 172e Phase D breakdown microcopy variants', () => {
  it('gross_label normal uses ml-oriented phrasing; safety mode strips it', () => {
    const normal = HYDRATION_MICROCOPY_STRINGS['hydration.breakdown.gross_label'].normal;
    const safety = HYDRATION_MICROCOPY_STRINGS['hydration.breakdown.gross_label'].safety_mode;
    expect(normal).toBe('Gross fluid');
    expect(safety).toBe('Composition');
  });

  it('effective_label normal uses effective phrasing; safety mode says Share', () => {
    const normal = HYDRATION_MICROCOPY_STRINGS['hydration.breakdown.effective_label'].normal;
    const safety = HYDRATION_MICROCOPY_STRINGS['hydration.breakdown.effective_label'].safety_mode;
    expect(normal).toBe('Effective');
    expect(safety).toBe('Share');
  });
});
