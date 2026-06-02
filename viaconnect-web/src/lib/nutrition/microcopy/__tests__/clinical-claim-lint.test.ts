// Prompt 172 Phase 1B (172a): build time clinical claim lint sweep.
//
// 170c section 13 requires that every AI generated or human authored user
// facing string the meal card surfaces pass the centralized clinical claim
// linter. Phase 0 ships the Phase 0 ruleset (prescriptive, diagnostic,
// curative, FDA approved phrasing); this test iterates every microcopy
// string in both variants and asserts the linter returns ok true.
//
// Failure here is a hard block. A failing key forces a copy rewrite, not a
// linter allowlist; we surface the offending key + variant + match so
// Hannah and Kelsey can rewrite without diff archaeology.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { describe, it, expect } from 'vitest';
import { lintClinicalClaims } from '@/lib/compliance/clinical-claim-linter';
import { MICROCOPY_STRINGS, MICROCOPY_KEYS } from '..';
import type { MicrocopyVariant } from '..';

const VARIANTS: ReadonlyArray<MicrocopyVariant> = ['normal', 'safety_mode'];

describe('microcopy clinical claim lint sweep', () => {
  it('exposes every microcopy key in MICROCOPY_KEYS', () => {
    // Mirror check: the readonly array must match the strings object keys.
    const fromMap = Object.keys(MICROCOPY_STRINGS).sort();
    const fromArr = [...MICROCOPY_KEYS].sort();
    expect(fromArr).toEqual(fromMap);
  });

  it('lints every string in both variants with zero violations', () => {
    const failures: Array<{
      key: string;
      variant: MicrocopyVariant;
      match: string;
      kind: string;
    }> = [];

    for (const key of MICROCOPY_KEYS) {
      for (const variant of VARIANTS) {
        const text = MICROCOPY_STRINGS[key][variant];
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

    // Render a readable assertion message so the failing keys surface
    // without test runners needing to expand a deep object diff.
    expect(
      failures,
      `Clinical claim linter violations in microcopy: ${JSON.stringify(failures, null, 2)}`,
    ).toEqual([]);
  });
});

describe('microcopy invariants the meal card relies on', () => {
  it('contains no em or en dashes in any string', () => {
    const offenders: Array<{ key: string; variant: MicrocopyVariant }> = [];
    for (const key of MICROCOPY_KEYS) {
      for (const variant of VARIANTS) {
        const text = MICROCOPY_STRINGS[key][variant];
        if (text.includes('—') || text.includes('–')) {
          offenders.push({ key, variant });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('safety_mode variants never reference calorie or gram absolutes', () => {
    // Spec 5.7 + 170c 8.4 hard rule. Safety mode renders ratios, never
    // absolutes. We do not catch every possible phrasing here, but the
    // most common literals are blocked outright. Macro chip labels are
    // exempt because labels stay; only values flip.
    const ABSOLUTE_TOKENS = ['kcal', 'calorie', 'gram', ' g ', ' g.', '%'];
    const LABEL_KEYS = new Set([
      'chips.calories.label',
      'chips.protein.label',
      'chips.carbs.label',
      'chips.fats.label',
    ]);
    const offenders: Array<{ key: string; token: string }> = [];
    for (const key of MICROCOPY_KEYS) {
      if (LABEL_KEYS.has(key)) continue;
      const text = MICROCOPY_STRINGS[key].safety_mode.toLowerCase();
      for (const tok of ABSOLUTE_TOKENS) {
        if (text.includes(tok.toLowerCase())) {
          offenders.push({ key, token: tok });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('exposes both variants on every key', () => {
    const missing: string[] = [];
    for (const key of MICROCOPY_KEYS) {
      const entry = MICROCOPY_STRINGS[key];
      if (typeof entry.normal !== 'string' || entry.normal.length === 0) {
        missing.push(`${key}.normal`);
      }
      if (typeof entry.safety_mode !== 'string' || entry.safety_mode.length === 0) {
        missing.push(`${key}.safety_mode`);
      }
    }
    expect(missing).toEqual([]);
  });
});
