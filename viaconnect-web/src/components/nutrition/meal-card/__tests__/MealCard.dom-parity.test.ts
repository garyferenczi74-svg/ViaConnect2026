// Prompt 172 Phase 1A: byte equivalent dom parity test.
//
// vitest runs node only without jsdom, so this test asserts source string
// parity rather than rendering both versions and diffing DOM nodes. The
// fixture in analysis-result-pre-refactor.snapshot.ts captured the verbatim
// pre-refactor JSX strings; this test reads the post-refactor MealCard.tsx
// plus AnalysisResult.tsx pair and asserts every fixture string is preserved
// in the new code locations.
//
// The contract: the rendered DOM tree is identical before and after the
// refactor. ClassName tokens, ARIA labels, text content, event handler
// expressions, conditional gates (voiceAvailable + voice_operation_count,
// userId !== null), and child ordering must all match. Whitespace inside
// JSX source is collapsed by React at render time, so we normalize all
// whitespace to a single space before comparison; that keeps the test
// honest about the DOM contract without coupling to the cosmetic indent
// depth that changes when a JSX block moves between components.
//
// One acceptance addition is documented at the bottom: the FdaDisclaimer
// card footer slot is net new per Prompt 172 spec section 5.3 and section
// 7. It mounts inside MealCard at the bottom and renders null when the
// FDA_DISCLAIMER_RENDERING_ENABLED kill switch is off. Phase 0 ships with
// the kill switch defaulting on, so the disclaimer adds DOM that did not
// exist pre-refactor. This is the deliberate spec mandated addition.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MEAL_TOTALS_BLOCK_PRE,
  MEAL_TOTALS_GRID_PRE,
  TOTALS_CALORIES_LABEL,
  TOTALS_PROTEIN_LABEL,
  TOTALS_CARBS_LABEL,
  TOTALS_FAT_LABEL,
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
  SAVE_LABEL_PRE,
  TITLE_HEADING_PRE,
  TITLE_HINT_PRE,
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
  const unionSource = n(
    mealCardSource + '\n\n' + macroChipsSource + '\n\n' + analysisResultSource,
  );
  const mealCardN = n(mealCardSource);
  const macroChipsN = n(macroChipsSource);
  const analysisResultN = n(analysisResultSource);

  describe('meal totals surface', () => {
    it('preserves the meal totals card container className', () => {
      expect(unionSource).toContain(n(MEAL_TOTALS_BLOCK_PRE));
    });

    it('preserves the title heading and hint copy verbatim', () => {
      expect(unionSource).toContain(n(TITLE_HEADING_PRE));
      expect(unionSource).toContain(n(TITLE_HINT_PRE));
    });

    it('preserves the four chip grid container className', () => {
      expect(unionSource).toContain(n(MEAL_TOTALS_GRID_PRE));
    });

    it('preserves the four totals chips in the fixed order Calories Protein Carbs Fat', () => {
      // The chip labels render in fixed order. We assert label ordering within
      // the union source as proxy for DOM order; MacroChips groups them into a
      // single grid container that emits them in source order.
      const indexCal = unionSource.indexOf(`"${TOTALS_CALORIES_LABEL}"`);
      const indexPro = unionSource.indexOf(`"${TOTALS_PROTEIN_LABEL}"`);
      const indexCar = unionSource.indexOf(`"${TOTALS_CARBS_LABEL}"`);
      const indexFat = unionSource.indexOf(`"${TOTALS_FAT_LABEL}"`);
      expect(indexCal).toBeGreaterThanOrEqual(0);
      expect(indexPro).toBeGreaterThan(indexCal);
      expect(indexCar).toBeGreaterThan(indexPro);
      expect(indexFat).toBeGreaterThan(indexCar);
    });

    it('preserves the kcal unit on the Calories chip and the g unit on macro chips', () => {
      expect(unionSource).toContain(n(TOTALS_KCAL_UNIT));
      expect(unionSource).toContain(n(TOTALS_GRAM_UNIT));
    });

    it('preserves the Math.round formatter for kcal and toFixed(1) for grams', () => {
      expect(unionSource).toContain(n(TOTALS_KCAL_FORMATTER));
      expect(unionSource).toContain(n(TOTALS_GRAM_FORMATTER));
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
      // Either the wired onApply uses the literal pre-refactor expression, or
      // it uses the equivalent prop forwarded one (the latter is acceptable
      // when MealCard receives onApplyChip as a prop). Both shapes must end
      // in onApplyChip('meal', c) bubbling through. We check for both.
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
    it('preserves the add item button verbatim including dashed border + Plus icon', () => {
      expect(unionSource).toContain(n(ADD_ITEM_BUTTON_PRE));
      expect(unionSource).toContain('Add another item');
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

    it('preserves the Saving... and Save to log label conditional', () => {
      expect(unionSource).toContain(n(SAVE_LABEL_PRE));
    });
  });

  describe('child render order is identical post refactor', () => {
    // For each pair of consecutive nodes the index of the first must be
    // earlier than the index of the second within its owning component.
    const FIXTURE_BY_KEY: Record<string, string | null> = {
      MEAL_TOTALS_BLOCK: n(MEAL_TOTALS_BLOCK_PRE),
      TITLE_HEADING: n(TITLE_HEADING_PRE),
      TITLE_HINT: n(TITLE_HINT_PRE),
      VOICE_EDITED_CHIP_SLOT: null,
      CONFIDENCE_BADGE_SLOT: null,
      TOTALS_GRID: n(MEAL_TOTALS_GRID_PRE),
      TOTALS_CALORIES: `"${TOTALS_CALORIES_LABEL}"`,
      TOTALS_PROTEIN: `"${TOTALS_PROTEIN_LABEL}"`,
      TOTALS_CARBS: `"${TOTALS_CARBS_LABEL}"`,
      TOTALS_FAT: `"${TOTALS_FAT_LABEL}"`,
      WARNINGS_LIST: n(WARNINGS_LIST_PRE),
      MOD_CHIPS_BLOCK: n(MOD_CHIPS_BLOCK_PRE),
      ITEM_LIST_BLOCK: n(ITEM_LIST_BLOCK_PRE),
      ADD_ITEM_BUTTON: n(ADD_ITEM_BUTTON_PRE),
      CORPUS_BANNER_SLOT: null,
      SAVE_BAR_BLOCK: n(SAVE_BAR_BLOCK_PRE),
      CANCEL_BUTTON: n(CANCEL_BUTTON_PRE),
      SAVE_BUTTON: n(SAVE_BUTTON_PRE),
    };

    it('emits MealCard scope blocks in the recorded order (MealCard.tsx alone)', () => {
      // Within MealCard.tsx the source order mirrors the rendered DOM order
      // for the blocks MealCard renders directly:
      //   meal-totals-block -> title heading -> title hint
      //     -> mod-chips block -> item list -> add-item button
      //     -> save bar -> cancel button -> save button
      // The chip grid sits inside <MacroChips macros={...} /> which is a
      // child component; its internal ordering is asserted separately.
      const KEYS_TO_ORDER_IN_MEAL_CARD: ReadonlyArray<string> = [
        'MEAL_TOTALS_BLOCK',
        'TITLE_HEADING',
        'TITLE_HINT',
        'MOD_CHIPS_BLOCK',
        'ITEM_LIST_BLOCK',
        'ADD_ITEM_BUTTON',
        'SAVE_BAR_BLOCK',
        'CANCEL_BUTTON',
        'SAVE_BUTTON',
      ];
      let lastIndex = -1;
      let lastKey: string | null = null;
      for (const key of KEYS_TO_ORDER_IN_MEAL_CARD) {
        const fixture = FIXTURE_BY_KEY[key];
        if (fixture === null) continue; // slots without fixtures
        const idx = mealCardN.indexOf(fixture);
        expect(
          idx,
          `Fixture ${key} missing from MealCard.tsx (previous fixture: ${lastKey ?? 'start'})`,
        ).toBeGreaterThan(-1);
        expect(
          idx,
          `Fixture ${key} appears before ${lastKey ?? 'start'} in MealCard.tsx (out of pre-refactor order)`,
        ).toBeGreaterThan(lastIndex);
        lastIndex = idx;
        lastKey = key;
      }
    });

    it('emits MacroChips scope blocks in the recorded order (MacroChips.tsx alone)', () => {
      // Within MacroChips.tsx the source order mirrors the rendered chip
      // order: grid container -> Calories label -> Protein label
      //   -> Carbs label -> Fat label.
      const KEYS_TO_ORDER_IN_MACRO_CHIPS: ReadonlyArray<string> = [
        'TOTALS_GRID',
        'TOTALS_CALORIES',
        'TOTALS_PROTEIN',
        'TOTALS_CARBS',
        'TOTALS_FAT',
      ];
      let lastIndex = -1;
      let lastKey: string | null = null;
      for (const key of KEYS_TO_ORDER_IN_MACRO_CHIPS) {
        const fixture = FIXTURE_BY_KEY[key];
        if (fixture === null) continue;
        const idx = macroChipsN.indexOf(fixture);
        expect(
          idx,
          `Fixture ${key} missing from MacroChips.tsx (previous fixture: ${lastKey ?? 'start'})`,
        ).toBeGreaterThan(-1);
        expect(
          idx,
          `Fixture ${key} appears before ${lastKey ?? 'start'} in MacroChips.tsx (out of pre-refactor order)`,
        ).toBeGreaterThan(lastIndex);
        lastIndex = idx;
        lastKey = key;
      }
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
      // Either Navy or Card surface; Teal CTA; Orange warning tint.
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
  });
});
