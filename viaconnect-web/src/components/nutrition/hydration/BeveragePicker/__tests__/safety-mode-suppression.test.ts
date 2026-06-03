// Prompt 172e Phase B: 170c section 8.4 silent UX proof.
//
// 170c section 8.4 promises that the safety mode user sees no visible
// indicator that safety mode is active. The BeveragePicker chrome (titles,
// labels, category cards, search field, log button) is identical across
// modes; only per beverage absolute numbers (kcal, sugar, caffeine, ABV,
// drink counts, diuretic copy) are suppressed in safety mode.
//
// These tests pin that contract at the source level. The suppression
// helpers in picker-state.ts are the single conditional point the UI
// consults; this test asserts the conditional fires only on the spec
// section 8 carve out list, never on chrome.

import { describe, it, expect } from 'vitest';
import {
  shouldShowKcal,
  shouldShowSugar,
  shouldShowCaffeine,
  shouldShowAbv,
  shouldShowAlcoholDrinkCount,
  shouldShowDiureticCopy,
  shouldShowVolumeNumber,
  shouldShowDefaultComparison,
} from '../picker-state';
import {
  HYDRATION_MICROCOPY_STRINGS,
  HYDRATION_MICROCOPY_KEYS,
} from '@/lib/nutrition/microcopy/hydration';
import {
  CATEGORY_ICONS,
  CATEGORY_MICROCOPY_KEYS,
} from '../category-icons';
import { BEVERAGE_CATEGORIES } from '../BeveragePicker.types';

describe('170c section 8 silent UX, suppressed numeric fields', () => {
  it('suppresses kcal in safety mode', () => {
    expect(shouldShowKcal(true)).toBe(false);
  });

  it('suppresses sugar in safety mode', () => {
    expect(shouldShowSugar(true)).toBe(false);
  });

  it('suppresses caffeine in safety mode', () => {
    expect(shouldShowCaffeine(true)).toBe(false);
  });

  it('suppresses ABV in safety mode', () => {
    expect(shouldShowAbv(true)).toBe(false);
  });

  it('suppresses alcohol drink count summaries in safety mode', () => {
    expect(shouldShowAlcoholDrinkCount(true)).toBe(false);
  });

  it('suppresses diuretic threshold copy in safety mode', () => {
    expect(shouldShowDiureticCopy(true)).toBe(false);
  });
});

describe('170c section 8.4 silent UX, chrome stays identical', () => {
  it('category icons are identical across modes (no mode branch)', () => {
    // The icon mapping has no safety mode axis. Each category has exactly
    // one icon used in both modes. Asserting the keys and values lets the
    // test catch a future drift if someone adds a per mode override.
    expect(Object.keys(CATEGORY_ICONS).sort()).toEqual([...BEVERAGE_CATEGORIES].sort());
    for (const cat of BEVERAGE_CATEGORIES) {
      expect(typeof CATEGORY_ICONS[cat]).toBe('object');
    }
  });

  it('category label microcopy is identical in normal and safety mode', () => {
    for (const cat of BEVERAGE_CATEGORIES) {
      const key = CATEGORY_MICROCOPY_KEYS[cat] as keyof typeof HYDRATION_MICROCOPY_STRINGS;
      const entry = HYDRATION_MICROCOPY_STRINGS[key];
      expect(
        entry.normal,
        `category ${cat} label drifted across modes: normal="${entry.normal}" safety_mode="${entry.safety_mode}"`,
      ).toBe(entry.safety_mode);
    }
  });

  it('picker chrome microcopy is identical in normal and safety mode', () => {
    // The picker chrome is every key that is not strictly informational about
    // a suppressed numeric. Phase B keys carry no mode specific copy. Phase C
    // added the alcohol diuretic threshold note (normal carries a {count}
    // placeholder, safety mode strips count + threshold framing). Phase D
    // added the breakdown gross + effective labels and the electrolyte
    // summary, all of which are numeric facing and thus get a qualitative
    // safety mode variant per 170c section 8. Allowlist these here so the
    // chrome invariant stays pinned for every other Phase B + Phase C +
    // Phase D key.
    const VARIANT_KEYS = new Set<string>([
      'hydration.alcohol.diuretic.threshold_note',
      'hydration.breakdown.gross_label',
      'hydration.breakdown.effective_label',
      'hydration.electrolytes.summary',
    ]);
    const drifted: Array<{ key: string; normal: string; safety_mode: string }> = [];
    for (const key of HYDRATION_MICROCOPY_KEYS) {
      if (VARIANT_KEYS.has(key)) continue;
      const entry = HYDRATION_MICROCOPY_STRINGS[key];
      if (entry.normal !== entry.safety_mode) {
        drifted.push({ key, normal: entry.normal, safety_mode: entry.safety_mode });
      }
    }
    expect(
      drifted,
      `Picker microcopy must read identical in both modes per 170c section 8.4. Drift: ${JSON.stringify(drifted, null, 2)}`,
    ).toEqual([]);
  });

  it('volume number and default vs yours scaffold stay visible in safety mode', () => {
    expect(shouldShowVolumeNumber(true)).toBe(true);
    expect(shouldShowDefaultComparison(true)).toBe(true);
  });
});

describe('alcohol category remains visible in safety mode per spec section 4 Gate 4', () => {
  it('alcohol is present in the category list', () => {
    expect(BEVERAGE_CATEGORIES).toContain('alcohol');
  });

  it('alcohol category has an icon and a label in both modes', () => {
    expect(CATEGORY_ICONS.alcohol).toBeTruthy();
    const labelKey = CATEGORY_MICROCOPY_KEYS.alcohol as keyof typeof HYDRATION_MICROCOPY_STRINGS;
    const entry = HYDRATION_MICROCOPY_STRINGS[labelKey];
    expect(entry.normal).toBe('Alcohol');
    expect(entry.safety_mode).toBe('Alcohol');
  });
});
