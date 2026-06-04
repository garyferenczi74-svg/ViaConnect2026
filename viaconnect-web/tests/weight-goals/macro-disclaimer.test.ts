// =============================================================================
// Prompt 173 Phase 9 (rebuild on main 2026-06-03): MACRO_DISCLAIMER_TEXT lock.
//
// The disclaimer is regulated copy (compliance memo Section 1). Removing or
// editing any of the US (FDA/FTC) or Canada (Health Canada) anchor phrases
// without a corresponding compliance review breaks the safety posture
// memorialized in docs/prompt-173/compliance-memo.md. This suite fails the
// build when any anchor is missing or when a dash characterizer slips into
// the text, so the husky gate is not the only line of defense.
//
// If a future revision INTENTIONALLY changes an anchor, update both this
// test AND the compliance memo in the same commit so the audit trail and
// the live string stay aligned.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { MACRO_DISCLAIMER_TEXT } from '@/components/nutrition/macro-disclaimer-text';

const US_FDA_ANCHOR =
  'not been evaluated to diagnose, treat, cure, or prevent any health condition';
const US_CA_NON_ADVICE_ANCHOR = 'not medical, dietetic, or clinical advice';
const NO_SIGNAL_GAP_ANCHOR =
  'pregnancy, breastfeeding, or a diagnosed medical condition';
const REFERRAL_ANCHOR = 'qualified healthcare or nutrition professional';

describe('MACRO_DISCLAIMER_TEXT US + Canada anchor lock', () => {
  it('contains the FDA structure / function non-evaluation anchor', () => {
    expect(MACRO_DISCLAIMER_TEXT).toContain(US_FDA_ANCHOR);
  });

  it('contains the US + Canada non-advice anchor', () => {
    expect(MACRO_DISCLAIMER_TEXT).toContain(US_CA_NON_ADVICE_ANCHOR);
  });

  it('covers the no-signal pregnancy / breastfeeding / diagnosed-condition gap', () => {
    expect(MACRO_DISCLAIMER_TEXT).toContain(NO_SIGNAL_GAP_ANCHOR);
  });

  it('routes the user to a qualified healthcare or nutrition professional', () => {
    expect(MACRO_DISCLAIMER_TEXT).toContain(REFERRAL_ANCHOR);
  });

  it('starts with the audience-scoping general wellness estimates framing', () => {
    expect(MACRO_DISCLAIMER_TEXT.startsWith(
      'These daily targets are general wellness estimates for healthy adults',
    )).toBe(true);
  });
});

describe('MACRO_DISCLAIMER_TEXT no-dash discipline', () => {
  it('contains no em-dash (U+2014)', () => {
    expect(MACRO_DISCLAIMER_TEXT.includes('—')).toBe(false);
  });

  it('contains no en-dash (U+2013)', () => {
    expect(MACRO_DISCLAIMER_TEXT.includes('–')).toBe(false);
  });
});

describe('MACRO_DISCLAIMER_TEXT Marshall dictionary posture', () => {
  // Marshall scan rule: public copy must not name compounds, drugs,
  // peptides, ingredients, or SNPs. The disclaimer is generic wellness
  // language by design; this guard catches accidental insertions if a
  // future tuning pass tries to weave a specific term into the text.
  const FORBIDDEN_KEYWORDS = [
    'semaglutide', 'tirzepatide', 'retatrutide', 'tesofensine',
    'creatine', 'whey', 'casein',
    'mthfr', 'comt', 'apoe', 'genex360',
  ];

  for (const kw of FORBIDDEN_KEYWORDS) {
    it(`does not name "${kw}"`, () => {
      expect(MACRO_DISCLAIMER_TEXT.toLowerCase().includes(kw.toLowerCase())).toBe(false);
    });
  }
});
