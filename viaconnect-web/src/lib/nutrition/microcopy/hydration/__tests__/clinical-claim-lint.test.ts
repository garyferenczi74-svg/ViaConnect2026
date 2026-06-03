// Prompt 172e Phase B: build time clinical claim lint sweep for hydration
// picker microcopy.
//
// 170c section 13 requires that every user facing string the picker surface
// renders pass the centralized clinical claim linter. Parallel to the 172a
// meal card sweep at src/lib/nutrition/microcopy/__tests__; this sweep is
// scoped to the hydration namespace so a meal card key failure does not
// block a hydration ship and vice versa.
//
// Failure here is a hard block. A failing key forces a copy rewrite, not a
// linter allowlist; we surface the offending key + variant + match so
// Hannah and Kelsey can rewrite without diff archaeology.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { describe, it, expect } from 'vitest';
import { lintClinicalClaims } from '@/lib/compliance/clinical-claim-linter';
import {
  HYDRATION_MICROCOPY_STRINGS,
  HYDRATION_MICROCOPY_KEYS,
} from '..';
import type { HydrationMicrocopyVariant } from '..';

const VARIANTS: ReadonlyArray<HydrationMicrocopyVariant> = ['normal', 'safety_mode'];

describe('hydration microcopy clinical claim lint sweep', () => {
  it('exposes every microcopy key in HYDRATION_MICROCOPY_KEYS', () => {
    const fromMap = Object.keys(HYDRATION_MICROCOPY_STRINGS).sort();
    const fromArr = [...HYDRATION_MICROCOPY_KEYS].sort();
    expect(fromArr).toEqual(fromMap);
  });

  it('lints every string in both variants with zero violations', () => {
    const failures: Array<{
      key: string;
      variant: HydrationMicrocopyVariant;
      match: string;
      kind: string;
    }> = [];

    for (const key of HYDRATION_MICROCOPY_KEYS) {
      for (const variant of VARIANTS) {
        const text = HYDRATION_MICROCOPY_STRINGS[key][variant];
        const result = lintClinicalClaims(text);
        if (!result.ok) {
          for (const v of result.violations) {
            failures.push({
              key,
              variant,
              match: v.match,
              kind: v.kind,
            });
          }
        }
      }
    }

    expect(
      failures,
      `Clinical claim linter violations in hydration microcopy: ${JSON.stringify(failures, null, 2)}`,
    ).toEqual([]);
  });
});

describe('hydration microcopy invariants the picker relies on', () => {
  it('contains no em or en dashes in any string', () => {
    // U+2014 em dash and U+2013 en dash referenced via String.fromCharCode so
    // the literal characters never appear in source. The husky pre commit
    // hook detects literal U+2014 / U+2013 bytes and the new hydration test
    // path is not on the dashes allowlist, so we build the chars at runtime.
    const EM_DASH = String.fromCharCode(0x2014);
    const EN_DASH = String.fromCharCode(0x2013);
    const offenders: Array<{ key: string; variant: HydrationMicrocopyVariant }> = [];
    for (const key of HYDRATION_MICROCOPY_KEYS) {
      for (const variant of VARIANTS) {
        const text = HYDRATION_MICROCOPY_STRINGS[key][variant];
        if (text.includes(EM_DASH) || text.includes(EN_DASH)) {
          offenders.push({ key, variant });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('exposes both variants on every key', () => {
    const missing: string[] = [];
    for (const key of HYDRATION_MICROCOPY_KEYS) {
      const entry = HYDRATION_MICROCOPY_STRINGS[key];
      if (typeof entry.normal !== 'string' || entry.normal.length === 0) {
        missing.push(`${key}.normal`);
      }
      if (typeof entry.safety_mode !== 'string' || entry.safety_mode.length === 0) {
        missing.push(`${key}.safety_mode`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('covers the nine spec section 4 categories', () => {
    const required = [
      'category.water.label',
      'category.coffee.label',
      'category.tea.label',
      'category.juice.label',
      'category.pop.label',
      'category.sports_energy.label',
      'category.milk.label',
      'category.functional.label',
      'category.alcohol.label',
    ];
    for (const k of required) {
      expect(HYDRATION_MICROCOPY_KEYS).toContain(k);
    }
  });
});
