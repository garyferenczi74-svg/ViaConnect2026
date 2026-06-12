/**
 * Unit tests for the voice operation applicator per Prompt 170j §11.4.
 *
 * Covers the 8 op kinds handled inline by the applicator (2 deferred to
 * orchestration layer per Phase 1c-3 add-item-handler.ts; 1 handled by
 * VoiceUndoStack) plus error paths.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  applyVoiceOperations,
  type VoiceMutatorHandles,
} from '../operation-applicator';
import type {
  MealDraft,
  MealItemDraft,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { VoiceOperation } from '../../types';

function makeMutators(): VoiceMutatorHandles {
  return {
    setPortion: vi.fn(),
    setCookingOil: vi.fn(),
    applyChip: vi.fn(),
    removeChip: vi.fn(),
    removeItem: vi.fn(),
  };
}

function makeItem(overrides: Partial<MealItemDraft> = {}): MealItemDraft {
  return {
    id: 'item-1',
    food_name: 'chicken breast',
    portion_grams: 142,
    nutrient_source: 'usda_fdc',
    per_100g: { calories_kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
    calories_kcal: 234,
    protein_g: 44,
    carbs_g: 0,
    fat_g: 5.1,
    user_modified: false,
    confidence_band: 'high',
    ...overrides,
  };
}

function makeDraft(items: MealItemDraft[]): MealDraft {
  return {
    id: 'draft-1',
    items,
    totals: {
      calories_kcal: items.reduce((s, it) => s + it.calories_kcal, 0),
      protein_g: items.reduce((s, it) => s + it.protein_g, 0),
      carbs_g: items.reduce((s, it) => s + it.carbs_g, 0),
      fat_g: items.reduce((s, it) => s + it.fat_g, 0),
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
      cholesterol_mg: 0,
    },
    meal_confidence: 0.85,
    warnings: [],
  };
}

describe('applyVoiceOperations: remove_item', () => {
  it('removes a matching item by exact name', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a', food_name: 'bread' })]);
    const op: VoiceOperation = {
      op_kind: 'remove_item',
      confidence: 0.95,
      natural_language_preview: 'remove bread',
      target_food: 'bread',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(result.rejected).toBe(0);
    expect(m.removeItem).toHaveBeenCalledWith('a');
  });

  it('matches partial substring case-insensitive', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a', food_name: 'Whole Wheat Bread' })]);
    const op: VoiceOperation = {
      op_kind: 'remove_item',
      confidence: 0.9,
      natural_language_preview: 'remove bread',
      target_food: 'bread',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.removeItem).toHaveBeenCalledWith('a');
  });

  it('returns target_not_found error when no item matches', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ food_name: 'chicken' })]);
    const op: VoiceOperation = {
      op_kind: 'remove_item',
      confidence: 0.95,
      natural_language_preview: 'remove bread',
      target_food: 'bread',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(0);
    expect(result.rejected).toBe(1);
    expect(result.errors[0].reason).toBe('target_not_found');
    expect(m.removeItem).not.toHaveBeenCalled();
  });
});

describe('applyVoiceOperations: modify_item_portion', () => {
  it('sets the new portion on the matched item', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a', food_name: 'rice' })]);
    const op: VoiceOperation = {
      op_kind: 'modify_item_portion',
      confidence: 0.9,
      natural_language_preview: 'rice to 150g',
      target_food: 'rice',
      new_portion_grams: 150,
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.setPortion).toHaveBeenCalledWith('a', 150);
  });
});

describe('applyVoiceOperations: modify_item_cooking_method', () => {
  it('maps grilled to applyChip', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a' })]);
    const op: VoiceOperation = {
      op_kind: 'modify_item_cooking_method',
      confidence: 0.9,
      natural_language_preview: 'change to grilled',
      target_food: 'chicken',
      new_cooking_method: 'grilled',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.applyChip).toHaveBeenCalledWith('a', 'grilled');
  });

  it('returns unsupported_op for cooking methods not in chip system', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a' })]);
    const op: VoiceOperation = {
      op_kind: 'modify_item_cooking_method',
      confidence: 0.9,
      natural_language_preview: 'change to pan_fried',
      target_food: 'chicken',
      new_cooking_method: 'pan_fried',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(0);
    expect(result.errors[0].reason).toBe('unsupported_op');
  });
});

describe('applyVoiceOperations: add_cooking_oil', () => {
  it('constructs a full CookingOilSelection with was_suggested_default false', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a' })]);
    const op: VoiceOperation = {
      op_kind: 'add_cooking_oil',
      confidence: 0.9,
      natural_language_preview: 'olive oil',
      target_food: 'chicken',
      oil_type: 'olive_oil',
      amount_ml: 30,
      amount_label: '2 tablespoons',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.setCookingOil).toHaveBeenCalledWith('a', {
      type: 'olive_oil',
      amount_ml: 30,
      was_suggested_default: false,
      suggested_default_type: 'none',
      suggested_default_amount_ml: 0,
    });
  });
});

describe('applyVoiceOperations: remove_cooking_oil', () => {
  it('passes type none with amount 0 to setCookingOil', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a' })]);
    const op: VoiceOperation = {
      op_kind: 'remove_cooking_oil',
      confidence: 0.9,
      natural_language_preview: 'remove oil',
      target_food: 'chicken',
      oil_type: 'all',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.setCookingOil).toHaveBeenCalledWith('a', expect.objectContaining({
      type: 'none',
      amount_ml: 0,
    }));
  });
});

describe('applyVoiceOperations: change_meal_portion', () => {
  it('scales every item portion by the multiplier', () => {
    const m = makeMutators();
    const items = [
      makeItem({ id: 'a', portion_grams: 100 }),
      makeItem({ id: 'b', portion_grams: 200 }),
    ];
    const draft = makeDraft(items);
    const op: VoiceOperation = {
      op_kind: 'change_meal_portion',
      confidence: 0.9,
      natural_language_preview: 'half a portion',
      multiplier: 0.5,
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.setPortion).toHaveBeenCalledWith('a', 50);
    expect(m.setPortion).toHaveBeenCalledWith('b', 100);
  });

  it('rejects non-positive multipliers as invalid_input', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem()]);
    const op: VoiceOperation = {
      op_kind: 'change_meal_portion',
      confidence: 0.9,
      natural_language_preview: 'zero',
      multiplier: 0,
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(0);
    expect(result.errors[0].reason).toBe('invalid_input');
  });
});

describe('applyVoiceOperations: add_modifier', () => {
  it('applies a known chip via applyChip', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a', food_name: 'bread' })]);
    const op: VoiceOperation = {
      op_kind: 'add_modifier',
      confidence: 0.9,
      natural_language_preview: 'with butter',
      target_food: 'bread',
      modifier_chip: 'butter',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.applyChip).toHaveBeenCalledWith('a', 'butter');
  });

  it('routes to meal-level when target_food is "meal"', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem()]);
    const op: VoiceOperation = {
      op_kind: 'add_modifier',
      confidence: 0.9,
      natural_language_preview: 'add cheese to meal',
      target_food: 'meal',
      modifier_chip: 'cheese',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.applyChip).toHaveBeenCalledWith('meal', 'cheese');
  });

  it('rejects unknown chips (dietary modifiers deferred to 170j-supplement)', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem()]);
    const op: VoiceOperation = {
      op_kind: 'add_modifier',
      confidence: 0.9,
      natural_language_preview: 'spicy',
      target_food: 'chicken',
      modifier_chip: 'spicy' as 'butter',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(0);
    expect(result.errors[0].reason).toBe('unsupported_op');
    expect(result.errors[0].message).toContain('not in v1 chip system');
  });
});

describe('applyVoiceOperations: remove_modifier', () => {
  it('calls removeChip with target id and chip', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem({ id: 'a', food_name: 'bread' })]);
    const op: VoiceOperation = {
      op_kind: 'remove_modifier',
      confidence: 0.9,
      natural_language_preview: 'no butter',
      target_food: 'bread',
      modifier_chip: 'butter',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(1);
    expect(m.removeChip).toHaveBeenCalledWith('a', 'butter');
  });
});

describe('applyVoiceOperations: deferred + sentinel ops', () => {
  it('returns unsupported_op for add_item (orchestrator handles)', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem()]);
    const op: VoiceOperation = {
      op_kind: 'add_item',
      confidence: 0.9,
      natural_language_preview: 'add salmon',
      food_name: 'salmon',
      portion_grams: 100,
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(0);
    expect(result.errors[0].reason).toBe('unsupported_op');
    expect(result.errors[0].message).toContain('Phase 1c');
  });

  it('returns unsupported_op for modify_chain_customization (needs 170e)', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem()]);
    const op: VoiceOperation = {
      op_kind: 'modify_chain_customization',
      confidence: 0.9,
      natural_language_preview: 'change protein to chicken',
      slot_key: 'protein',
      new_option: 'chicken',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(0);
    expect(result.errors[0].reason).toBe('unsupported_op');
    expect(result.errors[0].message).toContain('170e');
  });

  it('skips undo_last (handled by VoiceUndoStack at orchestration layer)', () => {
    const m = makeMutators();
    const draft = makeDraft([makeItem()]);
    const op: VoiceOperation = {
      op_kind: 'undo_last',
      confidence: 1.0,
      natural_language_preview: 'undo',
    };
    const result = applyVoiceOperations([op], draft, m);
    expect(result.applied).toBe(0);
    expect(result.rejected).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});

describe('applyVoiceOperations: error recovery', () => {
  it('catches mutator exceptions and reports as mutator_threw without blocking subsequent ops', () => {
    const m = makeMutators();
    (m.removeItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('database temporarily unavailable');
    });
    const draft = makeDraft([
      makeItem({ id: 'a', food_name: 'bread' }),
      makeItem({ id: 'b', food_name: 'rice' }),
    ]);
    const ops: VoiceOperation[] = [
      {
        op_kind: 'remove_item',
        confidence: 0.9,
        natural_language_preview: 'remove bread',
        target_food: 'bread',
      },
      {
        op_kind: 'modify_item_portion',
        confidence: 0.9,
        natural_language_preview: 'rice 150g',
        target_food: 'rice',
        new_portion_grams: 150,
      },
    ];
    const result = applyVoiceOperations(ops, draft, m);
    expect(result.applied).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.errors[0].reason).toBe('mutator_threw');
    expect(result.errors[0].message).toContain('database temporarily unavailable');
    expect(m.setPortion).toHaveBeenCalledWith('b', 150);
  });
});

describe('applyVoiceOperations: multi-op preserves order', () => {
  it('applies operations in array order', () => {
    const m = makeMutators();
    const order: string[] = [];
    (m.removeItem as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('remove'); });
    (m.setPortion as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('portion'); });
    (m.setCookingOil as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('oil'); });
    const draft = makeDraft([
      makeItem({ id: 'a', food_name: 'bread' }),
      makeItem({ id: 'b', food_name: 'rice' }),
      makeItem({ id: 'c', food_name: 'chicken' }),
    ]);
    const ops: VoiceOperation[] = [
      { op_kind: 'remove_item', confidence: 0.9, natural_language_preview: '', target_food: 'bread' },
      { op_kind: 'modify_item_portion', confidence: 0.9, natural_language_preview: '', target_food: 'rice', new_portion_grams: 150 },
      { op_kind: 'add_cooking_oil', confidence: 0.9, natural_language_preview: '', target_food: 'chicken', oil_type: 'olive_oil', amount_ml: 30, amount_label: '2 tbsp' },
    ];
    const result = applyVoiceOperations(ops, draft, m);
    expect(result.applied).toBe(3);
    expect(order).toEqual(['remove', 'portion', 'oil']);
  });
});
