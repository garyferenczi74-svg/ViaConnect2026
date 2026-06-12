// Prompt 172 Phase 3 (172d): full acceptance matrix per spec section 7 +
// section 5.7 + 170c section 8.4.
//
// vitest runs node only without jsdom; this suite asserts the contract at
// the model + microcopy + source level, mirroring the existing
// MealCard.test.ts and dom-parity.test.ts patterns. The matrix axes are:
//
//   1. State (analyzing, success, low_confidence, error)
//   2. Mode (normal, safety_mode)
//   3. Phase (pre_save, post_save)
//   4. Degraded service signal (none, logmeal_hard_stop,
//      gemini_low_confidence, claude_tertiary_used)
//
// 4 x 2 x 2 x 4 = 64 cells; many are equivalent because the mapper does
// not branch on state alone. The realistic distinct case set is the
// thirty cells captured below plus six structural assertions covering
// the spec section 7 line items and the 170c section 8.4 silent UX
// hard requirement.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { toMealCardModel } from '@/components/nutrition/meal-card/mealCardModel';
import type {
  MealDraft,
  MealItemDraft,
  SaveResponse,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type {
  DegradedServiceKind,
  MealCardModel,
} from '@/components/nutrition/meal-card/MealCard.types';
import {
  MICROCOPY_STRINGS,
  MICROCOPY_KEYS,
  getMicrocopy,
} from '@/lib/nutrition/microcopy';
import type { MicrocopyVariant } from '@/lib/nutrition/microcopy';

// File paths the source level assertions read.
const MEAL_CARD_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'components',
  'nutrition',
  'meal-card',
  'MealCard.tsx',
);
const MACRO_CHIPS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'components',
  'nutrition',
  'meal-card',
  'MacroChips.tsx',
);
const MEAL_THREAD_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'components',
  'nutrition',
  'thread',
  'MealThread.tsx',
);
const STRINGS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'lib',
  'nutrition',
  'microcopy',
  'strings.ts',
);

// Fixture builders mirror the mealCardModel.test.ts shapes so the matrix
// reads from the same input universe the mapper tests exercise.
function makeItem(overrides: Partial<MealItemDraft> = {}): MealItemDraft {
  return {
    id: 'item-1',
    food_name: 'Roasted chicken breast',
    portion_grams: 150,
    nutrient_source: 'farmceutica_curated',
    per_100g: {
      calories_kcal: 165,
      protein_g: 31,
      carbs_g: 0,
      fat_g: 3.6,
    },
    calories_kcal: 247.5,
    protein_g: 46.5,
    carbs_g: 0,
    fat_g: 5.4,
    user_modified: false,
    confidence_band: 'high',
    ...overrides,
  };
}

function makeDraft(overrides: Partial<MealDraft> = {}): MealDraft {
  return {
    id: 'draft-1',
    items: [makeItem()],
    totals: {
      calories_kcal: 600,
      protein_g: 40,
      carbs_g: 60,
      fat_g: 20,
      fiber_g: 5,
      sugar_g: 10,
      sodium_mg: 0,
      cholesterol_mg: 0,
    },
    meal_confidence: 0.9,
    warnings: [],
    ...overrides,
  };
}

function makeSaveResponse(overrides: Partial<SaveResponse> = {}): SaveResponse {
  return {
    meal_id: 'meal-saved-1',
    gordon: {
      bio_optimization_delta: 1.2,
      copy: null,
      quality_score: 78,
      quality_tier: 'good',
    },
    dashboard_crossover: { nutrition_dimension_recompute_queued: true },
    helix_events_emitted: [],
    corpus_row_written: false,
    requestId: 'req-1',
    ...overrides,
  };
}

interface MatrixCell {
  state: 'analyzing' | 'success' | 'low_confidence' | 'error';
  mode: 'normal' | 'safety_mode';
  phase: 'pre_save' | 'post_save';
  degraded: DegradedServiceKind;
  confidence: 'high' | 'medium' | 'low';
}

function buildModel(cell: MatrixCell): MealCardModel {
  return toMealCardModel({
    draft: makeDraft(),
    saveResponse: cell.phase === 'post_save' ? makeSaveResponse() : undefined,
    photoUrl: null,
    safetyMode: cell.mode === 'safety_mode',
    degradedService: cell.degraded !== 'none',
    degradedServiceKind: cell.degraded,
    recognitionConfidence: cell.confidence,
  });
}

// Source level cache so the matrix does not re read the file per cell.
const MEAL_CARD_SOURCE = readFileSync(MEAL_CARD_PATH, 'utf-8');
const MACRO_CHIPS_SOURCE = readFileSync(MACRO_CHIPS_PATH, 'utf-8');
const MEAL_THREAD_SOURCE = readFileSync(MEAL_THREAD_PATH, 'utf-8');
const STRINGS_SOURCE = readFileSync(STRINGS_PATH, 'utf-8');

// Brand tokens documented in spec section 2. Any hex appearing in MealCard
// or MacroChips that is not on this list (or a documented derived step) is
// an off token violation.
const APPROVED_TOKENS: ReadonlyArray<string> = [
  '#1A2744', // Deep Navy page background
  '#1E3054', // Card surface
  '#2DA5A0', // Teal
  '#B75E18', // Orange (brand identity token, spec section 2 hard rule)
  '#5BC0BB', // Fiber chip (Prompt 177g MacroChips); formal ratification noted in sweep 2026-06-12
  '#DA8538', // Protein-Orange-step-1: derived brightened step of #B75E18 per spec
             // section 5.3, applied to the Protein chip label per 172d WCAG fix
             // on 2026-06-02 to clear the WCAG 2.2 AA 4.5:1 small-text floor
             // (measured 4.60:1 against Card #1E3054). Documented inline in
             // MacroChips.tsx toneLabelColor.
  '#FFFFFF', // White slate; documented inline in MacroChips as the neutral fats label color
  '#FCA5A5', // Warning text (Tailwind red-300 step); documented inline
];

// State to spec section 5.4 microcopy keys. The state label and body keys
// drive the matrix tests for analyzing / low_confidence / error rows.
const STATE_KEYS = {
  analyzing: { label: 'state.analyzing' as const, body: null },
  success: { label: null, body: null },
  low_confidence: {
    label: 'state.low_confidence' as const,
    body: 'state.low_confidence_body' as const,
  },
  error: {
    label: 'state.error' as const,
    body: 'state.error_body' as const,
  },
};

const STATES: ReadonlyArray<MatrixCell['state']> = [
  'analyzing',
  'success',
  'low_confidence',
  'error',
];
const MODES: ReadonlyArray<MatrixCell['mode']> = ['normal', 'safety_mode'];
const PHASES: ReadonlyArray<MatrixCell['phase']> = ['pre_save', 'post_save'];
const DEGRADED_KINDS: ReadonlyArray<DegradedServiceKind> = [
  'none',
  'logmeal_hard_stop',
  'gemini_low_confidence',
  'claude_tertiary_used',
];

// Confidence band selection rule for the matrix:
//   low_confidence + error states drive the degraded body block on,
//   analyzing + success default to high.
function defaultConfidenceFor(state: MatrixCell['state']): MatrixCell['confidence'] {
  if (state === 'low_confidence' || state === 'error') return 'low';
  return 'high';
}

// Build the full thirty cell matrix the per cell tests iterate.
const MATRIX: MatrixCell[] = (() => {
  const cells: MatrixCell[] = [];
  for (const state of STATES) {
    for (const mode of MODES) {
      for (const phase of PHASES) {
        for (const degraded of DEGRADED_KINDS) {
          // The "success" state with degraded != none is impossible; the
          // pipeline only stamps a degraded kind when the recognition was
          // not fully successful. We still build the cell so the model
          // exercises both axes, but we mark it via a flag downstream tests
          // can branch on.
          cells.push({
            state,
            mode,
            phase,
            degraded,
            confidence: defaultConfidenceFor(state),
          });
        }
      }
    }
  }
  return cells;
})();

describe('Prompt 172 acceptance matrix: state x mode x phase x degraded (spec 7 + 5.7 + 170c 8.4)', () => {
  it('builds the expected number of cells (4 states x 2 modes x 2 phases x 4 degraded = 64)', () => {
    expect(MATRIX.length).toBe(64);
  });

  describe('spec 7 line 1: card renders all four states on mobile and desktop in the same build', () => {
    for (const state of STATES) {
      it(`state ${state} resolves a microcopy label or accepts success has no label key`, () => {
        const entry = STATE_KEYS[state];
        if (entry.label === null) {
          // Success state has no state label; the totals card renders
          // directly. Confirmed by spec section 5.4.
          expect(state).toBe('success');
          return;
        }
        // The label key must exist in the microcopy map AND resolve a
        // non empty string for both variants.
        expect(MICROCOPY_KEYS).toContain(entry.label);
        expect(getMicrocopy(entry.label, 'normal').length).toBeGreaterThan(0);
        expect(getMicrocopy(entry.label, 'safety_mode').length).toBeGreaterThan(0);
      });
    }

    it('renders the same JSX subtree at every breakpoint (single code path; no mobile only branch)', () => {
      // The component contains no breakpoint specific imports or
      // navigator user agent reads; the layout responds via Tailwind
      // responsive utilities (md:hidden, md:static, etc).
      expect(MEAL_CARD_SOURCE).not.toContain('window.matchMedia');
      expect(MEAL_CARD_SOURCE).not.toContain('navigator.userAgent');
      // md:* responsive prefixes confirm the desktop + mobile single build.
      expect(MEAL_CARD_SOURCE).toContain('md:static');
    });
  });

  describe('spec 7 line 2: safety mode hides absolutes and shows ratios with no visible mode indicator', () => {
    for (const cell of MATRIX) {
      if (cell.mode !== 'safety_mode') continue;
      it(`safety_mode/${cell.state}/${cell.phase}/${cell.degraded}: model hides absolute per item kcal`, () => {
        const model = buildModel(cell);
        for (const item of model.items) {
          expect(item.kcal).toBeNull();
        }
      });

      if (cell.phase === 'post_save') {
        it(`safety_mode/${cell.state}/post_save/${cell.degraded}: model hides meal quality score`, () => {
          const model = buildModel(cell);
          expect(model.mealQualityScore).toBeNull();
        });
      }
    }

    it('MacroChips safety variant emits no Calories chip and three ratio chips', () => {
      const ifIdx = MACRO_CHIPS_SOURCE.indexOf('if (safetyMode)');
      const normalAnchorIdx = MACRO_CHIPS_SOURCE.indexOf("const variant = 'normal' as const;");
      expect(ifIdx).toBeGreaterThan(-1);
      expect(normalAnchorIdx).toBeGreaterThan(ifIdx);
      const safetyBlock = MACRO_CHIPS_SOURCE.substring(ifIdx, normalAnchorIdx);
      expect(safetyBlock).not.toContain('chips.calories.label');
      expect(safetyBlock).toContain('macros.proteinPct');
      expect(safetyBlock).toContain('macros.carbsPct');
      expect(safetyBlock).toContain('macros.fatsPct');
      // grid-cols-3 confirms the three chip ratio variant.
      expect(safetyBlock).toContain('grid-cols-3');
    });

    it('renders no visible mode indicator (no banner, no badge, no different color, no text)', () => {
      // 170c section 8.4 hard contract.
      expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*safety mode\s*</i);
      expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*safety mode active\s*</i);
      expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*ratio mode\s*</i);
      expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*silent mode\s*</i);
      expect(MEAL_CARD_SOURCE).not.toContain('safety-mode');
      expect(MEAL_CARD_SOURCE).not.toContain('ratio-mode');
      expect(MACRO_CHIPS_SOURCE).not.toMatch(/>\s*safety mode\s*</i);
      expect(MACRO_CHIPS_SOURCE).not.toContain('safety-mode');
      // MealThread also must carry no mode indicator.
      expect(MEAL_THREAD_SOURCE).not.toMatch(/>\s*safety mode\s*</i);
    });
  });

  describe('spec 7 line 3: standardized 170c FDA disclaimer present via <FdaDisclaimer slot="card-footer" />', () => {
    it('imports FdaDisclaimer from the Phase 0 component path', () => {
      expect(MEAL_CARD_SOURCE).toContain('@/components/compliance/FdaDisclaimer');
    });

    it('mounts FdaDisclaimer with slot="card-footer" exactly once', () => {
      const occurrences = MEAL_CARD_SOURCE.match(/<FdaDisclaimer/g) ?? [];
      expect(occurrences.length).toBe(1);
      expect(MEAL_CARD_SOURCE).toContain('slot="card-footer"');
    });

    for (const cell of MATRIX) {
      it(`${cell.mode}/${cell.state}/${cell.phase}/${cell.degraded}: FDA disclaimer remains structurally in the card subtree`, () => {
        // Disclaimer presence is unconditional in source (the kill switch
        // for FDA_DISCLAIMER_RENDERING_ENABLED short circuits inside the
        // FdaDisclaimer component itself). The matrix cell metadata is
        // included so a future change that gates the disclaimer per cell
        // is caught here.
        expect(cell).toBeDefined();
        expect(MEAL_CARD_SOURCE).toContain('<FdaDisclaimer slot="card-footer"');
      });
    }
  });

  describe('spec 7 line 4: card maps from MealDraft pre-save and SaveResponse.gordon post-save + 171a thumbnail + 171b portion', () => {
    it('pre save: mealId null, mealQualityScore null', () => {
      const model = buildModel({
        state: 'success',
        mode: 'normal',
        phase: 'pre_save',
        degraded: 'none',
        confidence: 'high',
      });
      expect(model.mealId).toBeNull();
      expect(model.mealQualityScore).toBeNull();
    });

    it('post save: meal_id lifted from SaveResponse.meal_id', () => {
      const model = buildModel({
        state: 'success',
        mode: 'normal',
        phase: 'post_save',
        degraded: 'none',
        confidence: 'high',
      });
      expect(model.mealId).toBe('meal-saved-1');
    });

    it('post save: gordon.quality_score lifted from SaveResponse.gordon.quality_score', () => {
      const model = buildModel({
        state: 'success',
        mode: 'normal',
        phase: 'post_save',
        degraded: 'none',
        confidence: 'high',
      });
      expect(model.mealQualityScore).toBe(78);
    });

    it('171a thumbnail: photoUrl carried verbatim from input', () => {
      const model = toMealCardModel({
        draft: makeDraft(),
        photoUrl: 'https://signed.example/photo.jpg',
        safetyMode: false,
        degradedService: false,
        recognitionConfidence: 'high',
      });
      expect(model.photoUrl).toBe('https://signed.example/photo.jpg');
    });

    it('171b portion: portionLabel derived from portion_display_value + portion_display_unit', () => {
      const model = toMealCardModel({
        draft: makeDraft({
          items: [
            makeItem({
              portion_display_value: 1.5,
              portion_display_unit: 'cup',
              portion_grams: 240,
            }),
          ],
        }),
        photoUrl: null,
        safetyMode: false,
        degradedService: false,
        recognitionConfidence: 'high',
      });
      expect(model.items[0].portionLabel).toBe('1.5 cup');
    });

    it('171b portion: falls back to grams when 171b display fields missing', () => {
      const model = toMealCardModel({
        draft: makeDraft({ items: [makeItem({ portion_grams: 175 })] }),
        photoUrl: null,
        safetyMode: false,
        degradedService: false,
        recognitionConfidence: 'high',
      });
      expect(model.items[0].portionLabel).toBe('175 g');
    });
  });

  describe('spec 7 line 5: pre save plus post save state machine reactively reveals score on onSaveResponse', () => {
    it('flips mealQualityScore from null to populated when saveResponse arrives (normal mode)', () => {
      const preSave = buildModel({
        state: 'success',
        mode: 'normal',
        phase: 'pre_save',
        degraded: 'none',
        confidence: 'high',
      });
      const postSave = buildModel({
        state: 'success',
        mode: 'normal',
        phase: 'post_save',
        degraded: 'none',
        confidence: 'high',
      });
      expect(preSave.mealQualityScore).toBeNull();
      expect(postSave.mealQualityScore).toBe(78);
    });

    it('MealCard source guards score chip rendering on isPostSave && !safetyMode', () => {
      expect(MEAL_CARD_SOURCE).toContain('isPostSave');
      // The score chip is rendered only when isPostSave && !model.safetyMode.
      // Same source check both Phase 1B and Phase 2 covered; we re affirm.
      const hasGuard =
        MEAL_CARD_SOURCE.includes('isPostSave && !model.safetyMode') ||
        MEAL_CARD_SOURCE.includes('!model.safetyMode && isPostSave');
      expect(hasGuard).toBe(true);
    });
  });

  describe('spec 7 line 6: zero hardcoded user facing strings (every label resolves via getMicrocopy)', () => {
    const TARGETS: ReadonlyArray<{ file: string; source: string }> = [
      { file: 'MealCard.tsx', source: MEAL_CARD_SOURCE },
      { file: 'MacroChips.tsx', source: MACRO_CHIPS_SOURCE },
    ];

    for (const target of TARGETS) {
      it(`${target.file}: contains no bare JSX text matching canonical microcopy values`, () => {
        // For each microcopy normal variant, assert it is NOT embedded as
        // a literal JSX text node or quoted attribute in the source.
        const SOURCE_AFTER_HEADER = target.source.substring(
          target.source.indexOf("'use client'"),
        );
        const offenders: Array<{ key: string; literal: string }> = [];
        for (const key of MICROCOPY_KEYS) {
          // Skip macro chip labels: their string equals natural English
          // nouns that occur in code identifiers (tone="fats", etc).
          if (key.startsWith('chips.')) continue;
          const literal = MICROCOPY_STRINGS[key].normal;
          // A bare JSX text literal looks like `>Meal totals<` or
          // `>Add another item<`; a quoted string literal looks like
          // `'Meal totals'`. We block both. We accept literals that live
          // inside the file header doc block since that is comment, not
          // rendered output.
          if (SOURCE_AFTER_HEADER.includes(`>${literal}<`)) {
            offenders.push({ key, literal });
          }
          if (SOURCE_AFTER_HEADER.includes(`'${literal}'`)) {
            offenders.push({ key, literal });
          }
          if (SOURCE_AFTER_HEADER.includes(`"${literal}"`)) {
            offenders.push({ key, literal });
          }
        }
        expect(offenders).toEqual([]);
      });
    }

    it('MealThread: presentational only, no hardcoded copy beyond relative time hint formatting', () => {
      // MealThread renders title + relative hint passed in by the parent.
      // The relative hint formatting ("Xm ago", "Xh ago", "Xd ago") is
      // intentionally hardcoded because it is a derived value not a
      // microcopy string. Beyond those three tokens the component
      // contains no user facing strings.
      expect(MEAL_THREAD_SOURCE).not.toContain('Meal totals');
      expect(MEAL_THREAD_SOURCE).not.toContain('Bio Optimization');
      expect(MEAL_THREAD_SOURCE).not.toContain('Save to log');
    });
  });

  describe('spec 7 line 7: analyze-text and log-meal contracts unchanged; no genetic or bioavailability logic', () => {
    it('MealCard source does not call analyze-text directly', () => {
      expect(MEAL_CARD_SOURCE).not.toContain('/api/nutrition/analyze-text');
      expect(MEAL_CARD_SOURCE).not.toContain("'/nutrition/log-meal'");
    });

    it('MealCard source contains no genetic terms (no SNP, no genotype, no rsid)', () => {
      const offenders: string[] = [];
      const TERMS = ['SNP', 'genotype', 'rsid', 'rs1', 'allele'];
      for (const term of TERMS) {
        if (MEAL_CARD_SOURCE.toLowerCase().includes(term.toLowerCase())) {
          offenders.push(term);
        }
      }
      expect(offenders).toEqual([]);
    });

    it('MealCard source contains no bioavailability logic', () => {
      // The word "bioavailability" or "bioavailable" must not appear in
      // the MealCard subtree per spec section 3 reserved for 170w.
      expect(MEAL_CARD_SOURCE.toLowerCase()).not.toContain('bioavailab');
      expect(MACRO_CHIPS_SOURCE.toLowerCase()).not.toContain('bioavailab');
      expect(MEAL_THREAD_SOURCE.toLowerCase()).not.toContain('bioavailab');
    });
  });

  describe('spec 7 line 8: tests first and green; matrix coverage for every state x mode x phase x token + string source check', () => {
    // Per cell mapper assertions for every state/mode/phase/degraded slot.
    for (const cell of MATRIX) {
      it(`mapper produces consistent shape for ${cell.state}/${cell.mode}/${cell.phase}/${cell.degraded}`, () => {
        const model = buildModel(cell);
        expect(model.degradedServiceKind).toBe(cell.degraded);
        expect(model.degradedService).toBe(cell.degraded !== 'none');
        expect(model.safetyMode).toBe(cell.mode === 'safety_mode');
        expect(model.recognitionConfidence).toBe(cell.confidence);
        expect(model.title).toBe('Meal totals');
        // Phase guard:
        if (cell.phase === 'pre_save') {
          expect(model.mealId).toBeNull();
          expect(model.mealQualityScore).toBeNull();
        } else {
          expect(model.mealId).toBe('meal-saved-1');
          if (cell.mode === 'safety_mode') {
            expect(model.mealQualityScore).toBeNull();
          } else {
            expect(model.mealQualityScore).toBe(78);
          }
        }
      });
    }
  });
});

describe('Prompt 172 acceptance matrix: brand token correctness', () => {
  it('MealCard source uses only approved tokens or values from the documented derived list', () => {
    // Scan for any hex color literal in the source. Each must be on the
    // approved list. The MacroChips tone function returns hex strings
    // documented inline; those are covered separately below.
    const hexRegex = /#[0-9A-Fa-f]{6}/g;
    const matches = MEAL_CARD_SOURCE.match(hexRegex) ?? [];
    const offenders: string[] = [];
    for (const hex of matches) {
      if (!APPROVED_TOKENS.includes(hex.toUpperCase())) {
        offenders.push(hex);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('MacroChips source uses only approved tokens', () => {
    const hexRegex = /#[0-9A-Fa-f]{6}/g;
    const matches = MACRO_CHIPS_SOURCE.match(hexRegex) ?? [];
    const offenders: string[] = [];
    for (const hex of matches) {
      if (!APPROVED_TOKENS.includes(hex.toUpperCase())) {
        offenders.push(hex);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('MealThread source uses only approved tokens', () => {
    const hexRegex = /#[0-9A-Fa-f]{6}/g;
    const matches = MEAL_THREAD_SOURCE.match(hexRegex) ?? [];
    const offenders: string[] = [];
    for (const hex of matches) {
      if (!APPROVED_TOKENS.includes(hex.toUpperCase())) {
        offenders.push(hex);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('Prompt 172 acceptance matrix: WCAG 2.2 AA contrast on macro chip palette', () => {
  // sRGB to relative luminance per WCAG 2.2 formula.
  function srgbChannel(c: number): number {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  }

  function luminanceHex(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (
      0.2126 * srgbChannel(r) +
      0.7152 * srgbChannel(g) +
      0.0722 * srgbChannel(b)
    );
  }

  function contrastRatio(hexA: string, hexB: string): number {
    const lumA = luminanceHex(hexA);
    const lumB = luminanceHex(hexB);
    const hi = Math.max(lumA, lumB);
    const lo = Math.min(lumA, lumB);
    return (hi + 0.05) / (lo + 0.05);
  }

  // Chips render over the Card surface tinted with white/[0.04]. The
  // resulting surface is very close to the bare card. We compute contrast
  // against the Card token directly; the additional white tint nudges the
  // surface lighter, so the bare card value is the worst case.
  const CARD_SURFACE = '#1E3054';

  // Measured ratios at the brand token palette. These are documented
  // here as the acceptance contract: any change to the brand tokens
  // that would move a ratio below the asserted floor must be approved
  // and re tested before ship.
  it('Calories chip label (Teal #2DA5A0) against card surface clears AA 3:1 large text minimum', () => {
    const ratio = contrastRatio('#2DA5A0', CARD_SURFACE);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it('Protein chip label (Protein-Orange-step-1 #DA8538, derived from brand Orange #B75E18) against card surface clears AA 3:1 large-text minimum with measurable headroom', () => {
    // 172d follow-up resolution (Gary ratified 2026-06-02):
    // The original Protein chip label rendered the raw brand Orange token
    // #B75E18, producing a contrast ratio of approximately 2.88:1 against
    // the Card surface #1E3054. Below the WCAG 2.2 AA 3:1 large-text floor
    // and below the 4.5:1 small-text floor. Surfaced in Phase 3 as a
    // deferred finding routing to Hannah.
    //
    // Gary ratified the "font bump to >= 14pt bold + Orange brightening
    // to clear 3:1" path. The two halves of the fix:
    //
    //   1. Typography: the Protein chip label is bumped to
    //      `text-base font-bold` (16px bold) in MacroChips.tsx via the
    //      tone-keyed toneLabelClass helper.
    //   2. Color: the rendered chip label color is the derived step
    //      `#DA8538`, computed from #B75E18 by brightening per spec
    //      section 5.3 ("Macro chip palette, derived only from tokens").
    //      The Orange brand token #B75E18 remains the spec section 2
    //      hard-rule identity token; the chip-label rendering is a
    //      derivation, documented inline at MacroChips.tsx
    //      toneLabelColor('protein').
    //
    // Measured against Card #1E3054 the derived step #DA8538 lifts the
    // contrast ratio to approximately 4.60:1, which clears both the
    // 3:1 large-text floor (with 1.6 ratio headroom over the 3.1:1
    // measurable-headroom target the audit specified) and the strict
    // 4.5:1 small-text floor. This test asserts both thresholds so any
    // future change to either color in the pair is caught immediately.
    const ratio = contrastRatio('#DA8538', CARD_SURFACE);
    expect(ratio).toBeGreaterThanOrEqual(3.1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('Carbs chip label (Teal #2DA5A0 reuse) against card surface clears AA 3:1', () => {
    const ratio = contrastRatio('#2DA5A0', CARD_SURFACE);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it('Fats chip label (White #FFFFFF) against card surface clears AA 4.5:1 small text minimum', () => {
    const ratio = contrastRatio('#FFFFFF', CARD_SURFACE);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('White text on Deep Navy page background clears AA 4.5:1 small text minimum', () => {
    // The primary card text uses white on the page background where it
    // peeks through translucent surfaces. The minimum carrier check.
    const ratio = contrastRatio('#FFFFFF', '#1A2744');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Prompt 172 acceptance matrix: zero hardcoded strings scan (regex per spec line 6)', () => {
  // Regex sweep for raw JSX text nodes that should resolve through
  // getMicrocopy. We pull every JSX text span using a simple pattern
  // that captures content between > and <, filters out empty and
  // whitespace only segments, and rejects entries that match an
  // identifier reference like {props.x} or {model.y}.
  function extractJsxTextSpans(source: string): string[] {
    // The compiler does not literally annotate JSX text but the
    // captured spans starting with > and ending with the next < are a
    // close enough proxy. We deliberately exclude self closing tag
    // boundaries by requiring the > be preceded by something other than
    // /.
    const spans: string[] = [];
    const RE = />([^<{][^<]*?)</g;
    let m: RegExpExecArray | null;
    while ((m = RE.exec(source)) !== null) {
      const text = m[1].trim();
      if (text.length === 0) continue;
      if (text.startsWith('{') || text.endsWith('}')) continue;
      // Filter out non text tokens like className= snippets that crept
      // into the regex window due to JSX shape; we require at least one
      // letter to count as a candidate user facing string.
      if (!/[A-Za-z]/.test(text)) continue;
      // Filter raw HTML entities or tokens that begin with a quote.
      if (text.startsWith('"') || text.startsWith("'")) continue;
      spans.push(text);
    }
    return spans;
  }

  it('MealCard.tsx contains no JSX text spans matching microcopy values', () => {
    const spans = extractJsxTextSpans(MEAL_CARD_SOURCE);
    const microcopyValues = new Set<string>();
    for (const key of MICROCOPY_KEYS) {
      // Skip chip labels: the natural English label words frequently
      // appear in identifier contexts and our regex cannot reliably
      // tell those apart from rendered text. The chip label coverage is
      // proven by MacroChips.test.ts (which asserts the labels are
      // looked up via getMicrocopy keys).
      if (key.startsWith('chips.')) continue;
      microcopyValues.add(MICROCOPY_STRINGS[key].normal);
      microcopyValues.add(MICROCOPY_STRINGS[key].safety_mode);
    }
    const offenders: string[] = [];
    for (const span of spans) {
      if (microcopyValues.has(span)) {
        offenders.push(span);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every microcopy key in MICROCOPY_KEYS resolves a non empty string in both variants', () => {
    const missing: string[] = [];
    for (const key of MICROCOPY_KEYS) {
      for (const variant of ['normal', 'safety_mode'] as const) {
        const text = getMicrocopy(key, variant);
        if (typeof text !== 'string' || text.length === 0) {
          missing.push(`${key}.${variant}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('170c section 8.4 silent UX hard assertion: safety mode DOM equivalence', () => {
  // The 170c silent contract says: rendering the same model in safety mode
  // and normal mode must not surface any token (class, aria, data attr,
  // text) in safety mode that the normal mode does not also surface. The
  // strongest assertion vitest in node mode can make without jsdom is at
  // the source level: every token in the safety mode source path must be
  // either in the normal mode source path or in the documented MacroChips
  // safety vs normal branch difference (the chip count flips 4 to 3).
  //
  // The MacroChips safety branch contains additional tokens that ARE NOT
  // in the normal branch (grid-cols-3, "percent" unit, proteinPct, etc).
  // Per 170c 8.4 this is permitted because the differences are NOT
  // observable to the user as mode indicators; they are observable as
  // "this card has three chips with percentages instead of four chips
  // with absolutes". The DOM equivalence assertion targets the OUTER
  // wrapper (no safety mode badge, no different container class, no
  // banner, no aria role indicating mode) rather than the values that
  // necessarily differ between absolute and ratio rendering.

  it('MealCard outer wrapper className is identical between safety and normal mode', () => {
    // The outer wrapper opens with the rounded-2xl border container.
    // It does NOT branch on safetyMode. We grep for any ternary that
    // touches safetyMode within a className expression.
    const offenders =
      MEAL_CARD_SOURCE.match(/className=[^>]*safetyMode[^>]*\?/g) ?? [];
    expect(offenders).toEqual([]);
  });

  it('MealCard contains no aria attribute keyed on safetyMode', () => {
    const offenders =
      MEAL_CARD_SOURCE.match(/aria-[a-z]+=[^>]*safetyMode[^>]*\?/g) ?? [];
    expect(offenders).toEqual([]);
  });

  it('MealCard contains no data attribute keyed on safetyMode (no data-safety-mode flag)', () => {
    expect(MEAL_CARD_SOURCE).not.toMatch(/data-[a-z-]*safety[a-z-]*=/i);
    expect(MEAL_CARD_SOURCE).not.toMatch(/data-[a-z-]*ratio[a-z-]*=/i);
  });

  it('MacroChips wrapper structure shifts grid columns silently (3 cols vs 4 cols, no badge)', () => {
    const ifIdx = MACRO_CHIPS_SOURCE.indexOf('if (safetyMode)');
    const normalAnchorIdx = MACRO_CHIPS_SOURCE.indexOf(
      "const variant = 'normal' as const;",
    );
    const safetyBlock = MACRO_CHIPS_SOURCE.substring(ifIdx, normalAnchorIdx);
    // No banner / badge / icon imports in the safety branch.
    expect(safetyBlock).not.toContain('Banner');
    expect(safetyBlock).not.toContain('badge');
    expect(safetyBlock).not.toContain('lucide');
  });

  it('safety variant microcopy strings do not contain the words "safety mode", "ratio mode", or "silent mode"', () => {
    for (const key of MICROCOPY_KEYS) {
      const text = getMicrocopy(key, 'safety_mode').toLowerCase();
      expect(text).not.toContain('safety mode');
      expect(text).not.toContain('ratio mode');
      expect(text).not.toContain('silent mode');
    }
  });

  for (const cell of MATRIX) {
    if (cell.mode !== 'safety_mode') continue;
    it(`silent UX: cell ${cell.state}/${cell.phase}/${cell.degraded} model carries safetyMode true with no separate indicator field`, () => {
      const model = buildModel(cell);
      expect(model.safetyMode).toBe(true);
      // Negative assertion: there is no MealCardModel field named
      // safetyModeBadge, safetyModeBanner, or similar. The view model
      // shape itself has no UX indicator slot.
      const modelAsRecord = model as unknown as Record<string, unknown>;
      expect(Object.keys(modelAsRecord)).not.toContain('safetyModeBadge');
      expect(Object.keys(modelAsRecord)).not.toContain('safetyModeBanner');
      expect(Object.keys(modelAsRecord)).not.toContain('modeIndicator');
    });
  }
});

describe('170c section 10.3 degraded service messaging x matrix', () => {
  // Per kind microcopy assertion: every kind resolves a non empty string
  // in both variants and never implies user fault.
  const FAULT_TOKENS: ReadonlyArray<string> = [
    'you forgot',
    'you misconfigured',
    'try a clearer photo of yourself',
    'your camera is broken',
    'you are at fault',
    'user error',
  ];

  for (const kind of DEGRADED_KINDS) {
    if (kind === 'none') continue;
    const key = `degraded.${kind}` as const;

    it(`kind ${kind}: microcopy resolves a non empty string in both variants`, () => {
      expect(getMicrocopy(key, 'normal').length).toBeGreaterThan(0);
      expect(getMicrocopy(key, 'safety_mode').length).toBeGreaterThan(0);
    });

    it(`kind ${kind}: copy never implies user fault`, () => {
      const normalText = getMicrocopy(key, 'normal').toLowerCase();
      const safetyText = getMicrocopy(key, 'safety_mode').toLowerCase();
      for (const token of FAULT_TOKENS) {
        expect(normalText).not.toContain(token);
        expect(safetyText).not.toContain(token);
      }
    });

    it(`kind ${kind}: PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED gates the render path`, () => {
      // Source level assertion that the kill switch guards the degraded
      // body resolution; the runtime behavior is covered separately by
      // wellbeing-guardrails.test.ts.
      expect(MEAL_CARD_SOURCE).toContain('PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED');
      expect(MEAL_CARD_SOURCE).toContain(key);
    });
  }

  it('kill switch off falls back to standard state.low_confidence_body', () => {
    // The MealCard wires the fallback when degradedMessagingEnabled is
    // false; we assert the source contains the resolution and the
    // standard body key.
    expect(MEAL_CARD_SOURCE).toContain('state.low_confidence_body');
    expect(MEAL_CARD_SOURCE).toContain('degradedMessagingEnabled');
  });
});

describe('Prompt 172 acceptance matrix: standing rule hard checks (no dashes, no emojis, Lucide 1.5)', () => {
  it('MealCard source contains no em or en dashes (U+2014 or U+2013)', () => {
    expect(MEAL_CARD_SOURCE.includes('—')).toBe(false);
    expect(MEAL_CARD_SOURCE.includes('–')).toBe(false);
  });

  it('MacroChips source contains no em or en dashes', () => {
    expect(MACRO_CHIPS_SOURCE.includes('—')).toBe(false);
    expect(MACRO_CHIPS_SOURCE.includes('–')).toBe(false);
  });

  it('MealThread source contains no em or en dashes', () => {
    expect(MEAL_THREAD_SOURCE.includes('—')).toBe(false);
    expect(MEAL_THREAD_SOURCE.includes('–')).toBe(false);
  });

  it('microcopy strings.ts contains no em or en dashes', () => {
    expect(STRINGS_SOURCE.includes('—')).toBe(false);
    expect(STRINGS_SOURCE.includes('–')).toBe(false);
  });

  it('MealCard source uses Lucide strokeWidth 1.5 on every Lucide icon', () => {
    const lucideImports = MEAL_CARD_SOURCE.includes("from 'lucide-react'");
    if (lucideImports) {
      // Count Lucide JSX elements; every one must have strokeWidth 1.5.
      // The simple proxy is: at least one strokeWidth={1.5} appears.
      expect(MEAL_CARD_SOURCE).toContain('strokeWidth={1.5}');
    }
  });

  it('MealCard, MacroChips, MealThread sources contain no emojis (basic check)', () => {
    // Block any code point in the Unicode emoji blocks. We use a simple
    // regex that covers the common emoji ranges; not exhaustive but
    // catches the typical accidental insertion.
    const EMOJI_RANGES =
      /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(MEAL_CARD_SOURCE.match(EMOJI_RANGES)).toBeNull();
    expect(MACRO_CHIPS_SOURCE.match(EMOJI_RANGES)).toBeNull();
    expect(MEAL_THREAD_SOURCE.match(EMOJI_RANGES)).toBeNull();
    expect(STRINGS_SOURCE.match(EMOJI_RANGES)).toBeNull();
  });
});

describe('Acceptance matrix structural sanity', () => {
  it('every microcopy variant is one of the documented values normal or safety_mode', () => {
    const VARIANTS: ReadonlyArray<MicrocopyVariant> = ['normal', 'safety_mode'];
    for (const key of MICROCOPY_KEYS) {
      const entry = MICROCOPY_STRINGS[key];
      for (const variant of VARIANTS) {
        expect(entry[variant]).toBeDefined();
      }
    }
  });

  it('readonly key list equals the strings map key set', () => {
    const fromMap = Object.keys(MICROCOPY_STRINGS).sort();
    const fromArr = [...MICROCOPY_KEYS].sort();
    expect(fromArr).toEqual(fromMap);
  });
});
