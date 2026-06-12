// Prompt 172 Phase 3 (172d): wellbeing guardrail validation per 170c §8
// behavioral contract + 170c §10 degraded service messaging.
//
// Per rule tests prove the safety mode silent ratio contract holds and
// the degraded service messaging behaves per spec. The tests target the
// mapper, microcopy layer, source level branching, and kill switch
// gating; together they cover every line of 170c §8.4 + §10 that the
// MealCard surface must enforce.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { toMealCardModel } from '@/components/nutrition/meal-card/mealCardModel';
import type {
  MealDraft,
  MealItemDraft,
  SaveResponse,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { DegradedServiceKind } from '@/components/nutrition/meal-card/MealCard.types';
import {
  MICROCOPY_STRINGS,
  getMicrocopy,
} from '@/lib/nutrition/microcopy';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import { buildBosLine } from '@/lib/nutrition/bos-line/resolver';

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
const MAC_CHIPS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'components',
  'nutrition',
  'meal-card',
  'MacroChips.tsx',
);

const MEAL_CARD_SOURCE = readFileSync(MEAL_CARD_PATH, 'utf-8');
const MAC_CHIPS_SOURCE = readFileSync(MAC_CHIPS_PATH, 'utf-8');

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
      quality_score: 85,
      quality_tier: 'good',
    },
    dashboard_crossover: { nutrition_dimension_recompute_queued: true },
    helix_events_emitted: [],
    corpus_row_written: false,
    requestId: 'req-1',
    ...overrides,
  };
}

describe('170c §8.4 wellbeing guardrails: absolute calories and macros hidden in safety mode', () => {
  it('per item kcal is null when safety mode is on', () => {
    const model = toMealCardModel({
      draft: makeDraft({ items: [makeItem({ calories_kcal: 300 })] }),
      photoUrl: null,
      safetyMode: true,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    for (const item of model.items) {
      expect(item.kcal).toBeNull();
    }
  });

  it('per item kcal is preserved when safety mode is off', () => {
    const model = toMealCardModel({
      draft: makeDraft({ items: [makeItem({ calories_kcal: 300 })] }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.items[0].kcal).toBe(300);
  });

  it('MacroChips safety branch emits three chips with composition percentages, no kcal chip', () => {
    const ifIdx = MAC_CHIPS_SOURCE.indexOf('if (safetyMode)');
    const normalAnchor = MAC_CHIPS_SOURCE.indexOf(
      "const variant = 'normal' as const;",
    );
    expect(ifIdx).toBeGreaterThan(-1);
    expect(normalAnchor).toBeGreaterThan(ifIdx);
    const safetyBlock = MAC_CHIPS_SOURCE.substring(ifIdx, normalAnchor);
    expect(safetyBlock).toContain('macros.proteinPct');
    expect(safetyBlock).toContain('macros.carbsPct');
    expect(safetyBlock).toContain('macros.fatsPct');
    expect(safetyBlock).not.toContain('chips.calories.label');
    expect(safetyBlock).toContain('grid-cols-3');
  });

  it('mapper still computes macros object so the safety branch has values to read', () => {
    // The mapper does not flip macros to null in safety mode; it derives
    // composition ratios so the safety branch can render percentages.
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: null,
      safetyMode: true,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.macros.proteinPct).toBeGreaterThan(0);
    expect(model.macros.carbsPct).toBeGreaterThan(0);
    expect(model.macros.fatsPct).toBeGreaterThan(0);
    // The percentages should sum to roughly 100; allow rounding.
    const sum = model.macros.proteinPct + model.macros.carbsPct + model.macros.fatsPct;
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });
});

describe('170c §8.4 wellbeing guardrails: meal quality score not shown in safety mode', () => {
  it('mealQualityScore is null in safety mode even with a saved response', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      saveResponse: makeSaveResponse({
        gordon: {
          bio_optimization_delta: 1.2,
          copy: null,
          quality_score: 92,
          quality_tier: 'excellent',
        },
      }),
      photoUrl: null,
      safetyMode: true,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.mealQualityScore).toBeNull();
  });

  it('MealCard source guards the score chip on isPostSave && !safetyMode', () => {
    expect(MEAL_CARD_SOURCE).toContain('isPostSave && !model.safetyMode');
    expect(MEAL_CARD_SOURCE).toContain('data-meal-quality-score');
  });

  it('non safety mode still surfaces the score chip post save', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      saveResponse: makeSaveResponse(),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.mealQualityScore).toBe(85);
  });
});

describe('170c §8.4 wellbeing guardrails: BOS line uses qualitative delta variant only in safety mode', () => {
  it('positive_delta safety mode copy does not contain digits or quantitative tokens', () => {
    const line = buildBosLine({
      kind: 'positive_delta',
      mealId: 'meal-x',
      safetyMode: true,
    });
    expect(line.copy).not.toMatch(/\d/);
    expect(line.copy.toLowerCase()).not.toContain('points');
    expect(line.copy.toLowerCase()).not.toContain('score');
  });

  it('neutral safety mode copy is qualitative only', () => {
    const line = buildBosLine({
      kind: 'neutral',
      mealId: 'meal-x',
      safetyMode: true,
    });
    expect(line.copy).not.toMatch(/\d/);
    expect(line.copy.toLowerCase()).not.toContain('score');
  });

  it('gentle_caution safety mode copy is qualitative only', () => {
    const line = buildBosLine({
      kind: 'gentle_caution',
      mealId: 'meal-x',
      safetyMode: true,
    });
    expect(line.copy).not.toMatch(/\d/);
    expect(line.copy.toLowerCase()).not.toContain('score');
  });

  it('learning safety mode copy is qualitative only', () => {
    const line = buildBosLine({
      kind: 'learning',
      mealId: 'meal-x',
      safetyMode: true,
    });
    expect(line.copy).not.toMatch(/\d/);
    expect(line.copy.toLowerCase()).not.toContain('score');
  });

  it('normal mode positive_delta copy carries the canonical Bio Optimization Score name', () => {
    const line = buildBosLine({
      kind: 'positive_delta',
      mealId: 'meal-x',
      safetyMode: false,
    });
    expect(line.copy).toContain('Bio Optimization Score');
  });
});

describe('170c §8.4 wellbeing guardrails: acknowledgement uses food positive non optimization variant in safety mode', () => {
  it('high acknowledgement safety mode variant is food positive', () => {
    const text = getMicrocopy('acknowledgement.high', 'safety_mode');
    expect(text.toLowerCase()).toContain('logged');
    expect(text.toLowerCase()).not.toContain('solid meal');
    expect(text.toLowerCase()).not.toContain('score');
    expect(text.toLowerCase()).not.toContain('improved');
  });

  it('medium acknowledgement safety mode variant retains the gratitude framing', () => {
    const text = getMicrocopy('acknowledgement.medium', 'safety_mode');
    expect(text.toLowerCase()).toContain('logged');
    expect(text.toLowerCase()).not.toContain('score');
  });

  it('low acknowledgement safety mode variant avoids "sharpen" optimization framing', () => {
    const text = getMicrocopy('acknowledgement.low', 'safety_mode');
    expect(text.toLowerCase()).toContain('logged');
    expect(text.toLowerCase()).not.toContain('sharpen');
    expect(text.toLowerCase()).not.toContain('next time');
  });
});

describe('170c §8.4 wellbeing guardrails: FDA disclaimer remains present in safety mode', () => {
  it('MealCard source mounts FdaDisclaimer unconditionally (no safety mode gate)', () => {
    // The disclaimer mount is outside any safety mode branch. We assert
    // there is no ternary or conditional that hides the disclaimer
    // based on model.safetyMode.
    expect(MEAL_CARD_SOURCE).toContain('<FdaDisclaimer slot="card-footer"');
    // Negative: no expression wraps the FdaDisclaimer in a safetyMode
    // ternary. We grep for the literal pattern that would gate it.
    const gatedPattern = /\{\s*!?\s*model\.safetyMode[^}]*FdaDisclaimer/g;
    expect(MEAL_CARD_SOURCE.match(gatedPattern)).toBeNull();
  });
});

describe('170c §8.4 wellbeing guardrails: no visible mode indicator anywhere on the card', () => {
  it('MealCard contains no banner / badge / indicator text', () => {
    // No JSX text rendering safety / ratio / silent mode words.
    expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*safety mode\s*</i);
    expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*safety mode active\s*</i);
    expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*ratio mode\s*</i);
    expect(MEAL_CARD_SOURCE).not.toMatch(/>\s*silent mode\s*</i);
    expect(MEAL_CARD_SOURCE).not.toContain('SafetyModeBanner');
    expect(MEAL_CARD_SOURCE).not.toContain('SafetyModeBadge');
  });

  it('MealCard contains no className branch on safetyMode that changes container color', () => {
    // Any ternary expression that flips a Tailwind color class based on
    // safetyMode would be a visible indicator. We assert no such pattern
    // exists.
    const RE = /className=\{[^}]*safetyMode[^}]*\?[^}]*bg-/g;
    const matches = MEAL_CARD_SOURCE.match(RE) ?? [];
    expect(matches).toEqual([]);
  });

  it('MealCard contains no aria-label that says safety mode', () => {
    expect(MEAL_CARD_SOURCE).not.toMatch(/aria-label=["'][^"']*safety mode[^"']*["']/i);
  });

  it('MacroChips contains no visible mode indicator', () => {
    expect(MAC_CHIPS_SOURCE).not.toContain('safety-mode');
    expect(MAC_CHIPS_SOURCE).not.toContain('ratio-mode');
    expect(MAC_CHIPS_SOURCE).not.toMatch(/>\s*safety mode\s*</i);
  });
});

describe('170c §10 degraded service: every kind renders the right copy and never implies user fault', () => {
  const KINDS: ReadonlyArray<Exclude<DegradedServiceKind, 'none'>> = [
    'logmeal_hard_stop',
    'gemini_low_confidence',
    'claude_tertiary_used',
  ];

  for (const kind of KINDS) {
    const key = `degraded.${kind}` as const;

    it(`kind ${kind}: microcopy normal variant is non empty and describes a service side condition`, () => {
      const text = getMicrocopy(key, 'normal');
      expect(text.length).toBeGreaterThan(20);
      // Each canonical copy starts with the service condition framing.
      const SERVICE_TOKENS = [
        'recognition system',
        'recognition systems',
        'recognition confidence',
      ];
      const matchesAny = SERVICE_TOKENS.some((t) => text.toLowerCase().includes(t));
      expect(matchesAny).toBe(true);
    });

    it(`kind ${kind}: copy never implies user fault`, () => {
      for (const variant of ['normal', 'safety_mode'] as const) {
        const text = getMicrocopy(key, variant).toLowerCase();
        // User fault tokens that the spec section 10.4 prohibits.
        expect(text).not.toContain('you forgot');
        expect(text).not.toContain('your camera');
        expect(text).not.toContain('user error');
        expect(text).not.toContain('your fault');
        expect(text).not.toContain('try uploading a clearer photo of yourself');
        // §10.4 framing: "please review carefully" is the user agency
        // closer. We require the canonical phrase appears in normal copy
        // for user_agency_framing assurance.
        if (variant === 'normal') {
          expect(text).toContain('please review carefully');
        }
      }
    });
  }
});

describe('170c §10 degraded service: PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED gates the render path', () => {
  beforeEach(() => {
    delete process.env.PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED;
    delete process.env.NEXT_PUBLIC_PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED;
  });
  afterEach(() => {
    delete process.env.PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED;
    delete process.env.NEXT_PUBLIC_PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED;
  });

  it('defaults to true (170c §10.7 says defaults TRUE post Audit)', () => {
    expect(isKillSwitchEnabled('PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED')).toBe(true);
  });

  it('env override "false" flips the flag to false', () => {
    process.env.PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED = 'false';
    expect(isKillSwitchEnabled('PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED')).toBe(false);
  });

  it('env override "true" leaves the flag true', () => {
    process.env.PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED = 'true';
    expect(isKillSwitchEnabled('PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED')).toBe(true);
  });

  it('MealCard source resolves the kill switch and falls back to state.low_confidence_body when off', () => {
    expect(MEAL_CARD_SOURCE).toContain('PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED');
    expect(MEAL_CARD_SOURCE).toContain('degradedMessagingEnabled');
    // The body resolution short circuits to standard copy when the kill
    // switch is off. We assert both the degraded body keys and the
    // standard fallback key live in the resolution path.
    expect(MEAL_CARD_SOURCE).toContain('state.low_confidence_body');
    expect(MEAL_CARD_SOURCE).toContain('degraded.logmeal_hard_stop');
    expect(MEAL_CARD_SOURCE).toContain('degraded.gemini_low_confidence');
    expect(MEAL_CARD_SOURCE).toContain('degraded.claude_tertiary_used');
  });
});

describe('170c §8.13 kill switches default posture', () => {
  beforeEach(() => {
    delete process.env.EATING_DISORDER_SAFETY_MODE_ENABLED;
    delete process.env.NEXT_PUBLIC_EATING_DISORDER_SAFETY_MODE_ENABLED;
    delete process.env.FDA_DISCLAIMER_RENDERING_ENABLED;
    delete process.env.NEXT_PUBLIC_FDA_DISCLAIMER_RENDERING_ENABLED;
  });
  afterEach(() => {
    delete process.env.EATING_DISORDER_SAFETY_MODE_ENABLED;
    delete process.env.NEXT_PUBLIC_EATING_DISORDER_SAFETY_MODE_ENABLED;
    delete process.env.FDA_DISCLAIMER_RENDERING_ENABLED;
    delete process.env.NEXT_PUBLIC_FDA_DISCLAIMER_RENDERING_ENABLED;
  });

  it('EATING_DISORDER_SAFETY_MODE_ENABLED defaults to true', () => {
    expect(isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')).toBe(true);
  });

  it('FDA_DISCLAIMER_RENDERING_ENABLED defaults to true', () => {
    expect(isKillSwitchEnabled('FDA_DISCLAIMER_RENDERING_ENABLED')).toBe(true);
  });
});

describe('170c §8.4 wellbeing guardrails: no quantitative score talk in safety mode microcopy', () => {
  it('every safety mode microcopy variant for the meal card surface drops kcal, grams, and points', () => {
    // Macro chip labels are exempt because labels carry the same noun
    // in both variants; only the rendered value flips from absolute to
    // ratio. Every other safety variant must be quantitative free.
    const LABEL_KEYS = new Set([
      'chips.calories.label',
      'chips.protein.label',
      'chips.carbs.label',
      'chips.fats.label',
    ]);
    for (const [key, entry] of Object.entries(MICROCOPY_STRINGS)) {
      if (LABEL_KEYS.has(key)) continue;
      const text = entry.safety_mode.toLowerCase();
      expect(text).not.toContain('kcal');
      expect(text).not.toContain('calorie');
      expect(text).not.toContain('gram');
      expect(text).not.toContain(' points');
      expect(text).not.toContain('points.');
    }
  });
});
