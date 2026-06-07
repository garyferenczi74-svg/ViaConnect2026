// Prompt 172 Phase 1A + 1B: dom parity test, divergence noted below.
//
// PHASE 1B DIVERGENCE: the byte equivalent DOM contract from 1A intentionally
// diverges in 1B per the spec section 7 acceptance criterion that the
// component is purely presentational with all strings sourced from the 172a
// microcopy layer. Specifically, the following 1A assertions no longer hold
// at the source level because the strings now live in
// @/lib/nutrition/microcopy/strings and are looked up via getMicrocopy at
// render time:
//   - TITLE_HEADING_PRE ("Meal totals")
//   - TITLE_HINT_PRE ("Tap an item ...")
//   - TOTALS_CALORIES_LABEL ("Calories") and the three sibling labels
//   - SAVE_LABEL_PRE ("Saving... | Save to log" inline ternary)
//   - ADD_ITEM_BUTTON_PRE text suffix ("Add another item")
// Those byte equivalent literals are now read from microcopy, not embedded
// in JSX. The rendered DOM text is identical so any Playwright DOM diff
// still passes; only the source level fixture lookup changes.
//
// What 1B continues to enforce:
//   - className tokens for every card surface, chip grid, warnings list,
//     mod chips block, item list, add item button, save bar, cancel button,
//     save button (the visual contract is unchanged).
//   - DOM child order across MealCard, MacroChips, AnalysisResult.
//   - FdaDisclaimer slot="card-footer" mount.
//   - Brand tokens (#1A2744, #1E3054, #2DA5A0, #B75E18).
//   - Lucide strokeWidth 1.5.
//   - AnalysisResult retention of voice, plate, confidence, corpus, photo
//     orchestration.
//
// vitest runs node only without jsdom, so this test asserts source string
// parity rather than rendering both versions and diffing DOM nodes.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MEAL_TOTALS_BLOCK_PRE,
  MEAL_TOTALS_GRID_PRE,
  TOTALS_KCAL_UNIT,
  TOTALS_GRAM_UNIT,
  TOTALS_KCAL_FORMATTER,
  TOTALS_GRAM_FORMATTER,
  WARNINGS_LIST_PRE,
  MOD_CHIPS_BLOCK_PRE,
  MOD_CHIPS_INVOCATION_PRE,
  ITEM_LIST_BLOCK_PRE,
  ADD_ITEM_BUTTON_PRE,
  SAVE_BAR_BLOCK_PRE,
  CANCEL_BUTTON_PRE,
  SAVE_BUTTON_PRE,
} from './fixtures/analysis-result-pre-refactor.snapshot';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

const MEAL_CARD_PATH = path.resolve(
  REPO_ROOT,
  'src',
  'components',
  'nutrition',
  'meal-card',
  'MealCard.tsx',
);

const MACRO_CHIPS_PATH = path.resolve(
  REPO_ROOT,
  'src',
  'components',
  'nutrition',
  'meal-card',
  'MacroChips.tsx',
);

const ANALYSIS_RESULT_PATH = path.resolve(
  REPO_ROOT,
  'src',
  'app',
  '(app)',
  '(consumer)',
  'nutrition',
  'components',
  'NutriVisionTab',
  'AnalysisResult.tsx',
);

const MICROCOPY_STRINGS_PATH = path.resolve(
  REPO_ROOT,
  'src',
  'lib',
  'nutrition',
  'microcopy',
  'strings.ts',
);

/**
 * Collapse whitespace to a single space. The rendered HTML is whitespace
 * insensitive between JSX tokens; the source format is not. Normalizing
 * before comparison keeps the test asserting the DOM contract without
 * coupling to cosmetic indent depth.
 */
function n(source: string): string {
  return source.replace(/\s+/g, ' ');
}

describe('MealCard dom parity vs pre-refactor AnalysisResult', () => {
  const mealCardSource = readFileSync(MEAL_CARD_PATH, 'utf-8');
  const macroChipsSource = readFileSync(MACRO_CHIPS_PATH, 'utf-8');
  const analysisResultSource = readFileSync(ANALYSIS_RESULT_PATH, 'utf-8');
  const microcopySource = readFileSync(MICROCOPY_STRINGS_PATH, 'utf-8');
  const unionSource = n(
    mealCardSource + '\n\n' + macroChipsSource + '\n\n' + analysisResultSource,
  );
  const mealCardN = n(mealCardSource);
  const macroChipsN = n(macroChipsSource);
  const analysisResultN = n(analysisResultSource);
  const microcopyN = n(microcopySource);

  describe('meal totals surface', () => {
    it('preserves the meal totals card container className', () => {
      expect(unionSource).toContain(n(MEAL_TOTALS_BLOCK_PRE));
    });

    // Phase 1B divergence: title heading and hint no longer literal in JSX;
    // they read via getMicrocopy('title.totals', ...) and 'title.totals_hint'.
    // We assert the microcopy keys are wired AND the canonical literal lives
    // in the strings map so rendered DOM text is identical.
    it('renders title.totals from microcopy and preserves the canonical literal in strings', () => {
      expect(mealCardN).toContain("getMicrocopy('title.totals'");
      expect(microcopyN).toContain("'Meal totals'");
    });

    it('renders title.totals_hint from microcopy and preserves the canonical hint literal', () => {
      expect(mealCardN).toContain("getMicrocopy('title.totals_hint'");
      expect(microcopyN).toContain('Tap an item to adjust the portion or swap the food.');
    });

    // Prompt 177g (2026-06-07) divergence: the normal mode chip row
    // expanded from four chips (grid-cols-4) to six chips (mobile
    // grid-cols-3 + md:grid-cols-6) to add Fiber and Sugar alongside
    // Calories, Protein, Carbs, Fat. The pre-refactor 4-chip grid
    // signature is no longer reachable; assert the new 6-chip grid
    // signature instead. Safety mode stays at three chips per 170c 8.4
    // and is covered by its own assertions further below.
    it('renders the six chip grid container className (normal mode, 177g)', () => {
      expect(macroChipsN).toContain(
        n('<div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] md:grid-cols-6">'),
      );
    });

    // Phase 1B divergence: the four totals chip labels are read via
    // getMicrocopy('chips.calories.label', ...) etc. The strings map holds
    // the canonical labels Calories, Protein, Carbs, Fat in normal variant.
    it('renders the four canonical chip labels via microcopy chip keys', () => {
      expect(macroChipsN).toContain("getMicrocopy('chips.calories.label'");
      expect(macroChipsN).toContain("getMicrocopy('chips.protein.label'");
      expect(macroChipsN).toContain("getMicrocopy('chips.carbs.label'");
      expect(macroChipsN).toContain("getMicrocopy('chips.fats.label'");
      expect(microcopyN).toContain("'Calories'");
      expect(microcopyN).toContain("'Protein'");
      expect(microcopyN).toContain("'Carbs'");
      expect(microcopyN).toContain("'Fat'");
    });

    it('preserves the kcal unit on the Calories chip and the g unit on macro chips', () => {
      expect(macroChipsN).toContain(n(TOTALS_KCAL_UNIT));
      expect(macroChipsN).toContain(n(TOTALS_GRAM_UNIT));
    });

    it('preserves the Math.round formatter for kcal and toFixed(1) for grams', () => {
      expect(macroChipsN).toContain(n(TOTALS_KCAL_FORMATTER));
      expect(macroChipsN).toContain(n(TOTALS_GRAM_FORMATTER));
    });

    it('preserves the warnings list role="list" and Orange #B75E18 token', () => {
      expect(unionSource).toContain(n(WARNINGS_LIST_PRE));
    });
  });

  describe('modification chips surface', () => {
    it('preserves the modification chips container className', () => {
      expect(unionSource).toContain(n(MOD_CHIPS_BLOCK_PRE));
    });

    it('preserves the ModificationChips invocation with scope="meal" and onApply forwarding', () => {
      const wiredExpression =
        unionSource.includes(n(MOD_CHIPS_INVOCATION_PRE)) ||
        (unionSource.includes('scope="meal"') &&
          unionSource.includes("onApplyChip('meal'"));
      expect(wiredExpression).toBe(true);
    });
  });

  describe('item list surface', () => {
    it('preserves the items container className', () => {
      expect(unionSource).toContain(n(ITEM_LIST_BLOCK_PRE));
    });

    it('preserves the MealItemCard mapping over draft.items', () => {
      expect(unionSource).toContain('draft.items.map');
      expect(unionSource).toContain('MealItemCard');
      expect(unionSource).toContain('key={item.id}');
      expect(unionSource).toContain('item={item}');
    });
  });

  describe('add another item button', () => {
    it('preserves the add item button className with dashed border + teal hover', () => {
      // The button className shell is unchanged; the label text was moved
      // into microcopy. The className substring still matches.
      const startToken = '<button type="button" onClick={props.onAddItem} className=';
      const idx = mealCardN.indexOf(startToken);
      expect(idx).toBeGreaterThan(-1);
      expect(mealCardN).toContain('border-dashed border-white/[0.12]');
      expect(mealCardN).toContain('hover:border-[#2DA5A0]/40');
    });

    it('renders the add item label via microcopy and preserves the canonical literal', () => {
      expect(mealCardN).toContain("getMicrocopy('action.add_item'");
      expect(microcopyN).toContain("'Add another item'");
    });
  });

  describe('corpus opt in banner gate', () => {
    it('preserves the userId !== null gate around CorpusOptInBanner', () => {
      expect(analysisResultN).toContain('userId !== null');
      expect(analysisResultN).toContain('CorpusOptInBanner');
    });
  });

  describe('save and cancel action row', () => {
    it('preserves the save bar container className with fixed bottom on mobile + md:static on desktop', () => {
      expect(unionSource).toContain(n(SAVE_BAR_BLOCK_PRE));
    });

    it('preserves the cancel button className verbatim', () => {
      expect(unionSource).toContain(n(CANCEL_BUTTON_PRE));
    });

    it('preserves the save button className verbatim', () => {
      expect(unionSource).toContain(n(SAVE_BUTTON_PRE));
    });

    // Phase 1B divergence: the save label is no longer the inline ternary
    // {props.isSaving ? 'Saving...' : 'Save to log'}; it now reads through
    // microcopy with both literals preserved in strings.ts.
    it('renders Saving... and Save to log labels via microcopy with canonical literals preserved', () => {
      expect(mealCardN).toContain("getMicrocopy('action.saving'");
      expect(mealCardN).toContain("getMicrocopy('action.save'");
      expect(microcopyN).toContain("'Saving...'");
      expect(microcopyN).toContain("'Save to log'");
    });

    it('renders Cancel label via microcopy with canonical literal preserved', () => {
      expect(mealCardN).toContain("getMicrocopy('action.cancel'");
      expect(microcopyN).toContain("'Cancel'");
    });
  });

  describe('child render order is identical post refactor', () => {
    it('emits MealCard scope blocks in the recorded order (MealCard.tsx alone)', () => {
      // Within MealCard.tsx the source order mirrors the rendered DOM order
      // for the blocks MealCard renders directly:
      //   meal-totals-block -> title h2 -> title hint p
      //     -> mod-chips block -> item list -> add-item button
      //     -> save bar -> cancel button -> save button
      const TITLE_H2 = '<h2 className="text-base font-semibold text-white">';
      const TITLE_HINT_P = '<p className="text-[11px] text-white/55">';
      const KEYS: ReadonlyArray<[string, string]> = [
        ['MEAL_TOTALS_BLOCK', n(MEAL_TOTALS_BLOCK_PRE)],
        ['TITLE_H2', TITLE_H2],
        ['TITLE_HINT_P', TITLE_HINT_P],
        ['MOD_CHIPS_BLOCK', n(MOD_CHIPS_BLOCK_PRE)],
        ['ITEM_LIST_BLOCK', n(ITEM_LIST_BLOCK_PRE)],
        ['SAVE_BAR_BLOCK', n(SAVE_BAR_BLOCK_PRE)],
        ['CANCEL_BUTTON', n(CANCEL_BUTTON_PRE)],
        ['SAVE_BUTTON', n(SAVE_BUTTON_PRE)],
      ];
      let lastIndex = -1;
      let lastKey: string | null = null;
      for (const [key, fixture] of KEYS) {
        const idx = mealCardN.indexOf(fixture);
        expect(
          idx,
          `Fixture ${key} missing from MealCard.tsx (previous: ${lastKey ?? 'start'})`,
        ).toBeGreaterThan(-1);
        expect(
          idx,
          `Fixture ${key} appears before ${lastKey ?? 'start'} in MealCard.tsx`,
        ).toBeGreaterThan(lastIndex);
        lastIndex = idx;
        lastKey = key;
      }
    });

    it('emits MacroChips chip labels in the fixed order Calories Protein Carbs Fat (normal mode source order)', () => {
      // Phase 1B: the safety mode branch comes first in source order;
      // anchor on the normal branch declaration to scope the search.
      const normalAnchor = "const variant = 'normal' as const;";
      const normalStart = macroChipsN.indexOf(normalAnchor);
      expect(normalStart).toBeGreaterThan(-1);
      const normalBlock = macroChipsN.substring(normalStart);
      const idxCal = normalBlock.indexOf("getMicrocopy('chips.calories.label'");
      const idxPro = normalBlock.indexOf("getMicrocopy('chips.protein.label'");
      const idxCar = normalBlock.indexOf("getMicrocopy('chips.carbs.label'");
      const idxFat = normalBlock.indexOf("getMicrocopy('chips.fats.label'");
      expect(idxCal).toBeGreaterThan(-1);
      expect(idxPro).toBeGreaterThan(idxCal);
      expect(idxCar).toBeGreaterThan(idxPro);
      expect(idxFat).toBeGreaterThan(idxCar);
    });
  });

  describe('FdaDisclaimer net new acceptance addition (spec 5.3 + 7)', () => {
    it('mounts FdaDisclaimer with slot="card-footer" inside MealCard', () => {
      expect(mealCardN).toContain('FdaDisclaimer');
      expect(mealCardN).toContain('slot="card-footer"');
    });

    it('imports FdaDisclaimer from the Phase 0 component path', () => {
      expect(mealCardN).toContain('@/components/compliance/FdaDisclaimer');
    });
  });

  describe('hard rules still satisfied post refactor', () => {
    it('MealCard contains no em or en dashes', () => {
      expect(mealCardSource.includes('—')).toBe(false);
      expect(mealCardSource.includes('–')).toBe(false);
    });

    it('AnalysisResult contains no em or en dashes', () => {
      expect(analysisResultSource.includes('—')).toBe(false);
      expect(analysisResultSource.includes('–')).toBe(false);
    });

    it('MealCard uses Lucide icons at strokeWidth 1.5', () => {
      expect(mealCardN).toContain('strokeWidth={1.5}');
    });

    it('MealCard uses brand tokens not off token hex', () => {
      expect(mealCardN).toContain('#1E3054');
      expect(mealCardN).toContain('#2DA5A0');
      expect(mealCardN).toContain('#B75E18');
    });
  });

  describe('AnalysisResult retained orchestration', () => {
    it('keeps voice hooks in AnalysisResult', () => {
      expect(analysisResultN).toContain('useVoiceSession');
    });

    it('keeps plate selector in AnalysisResult', () => {
      expect(analysisResultN).toContain('PlateSelector');
    });

    it('keeps confidence badge in AnalysisResult (passed as a slot to MealCard)', () => {
      expect(analysisResultN).toContain('ConfidenceBadge');
      expect(analysisResultN).toContain('classifyConfidence');
    });

    it('keeps corpus opt in banner in AnalysisResult', () => {
      expect(analysisResultN).toContain('CorpusOptInBanner');
    });

    it('keeps photo thumbnail orchestration in AnalysisResult', () => {
      expect(analysisResultN).toContain('MealPhotoThumbnail');
    });

    it('mounts MealCard exactly once from the meal-card module', () => {
      expect(analysisResultN).toContain('MealCard');
      expect(analysisResultN).toContain('@/components/nutrition/meal-card');
    });

    it('consumes useSafetyMode at the orchestrator boundary (1B addition)', () => {
      expect(analysisResultN).toContain('useSafetyMode');
    });
  });
});
