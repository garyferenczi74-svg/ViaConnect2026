import { describe, it, expect } from 'vitest';
import {
  contractFromDraft,
  contractFromAnalysis,
  isMealCardEntrySource,
  logSourceForEntry,
  encodePendingRawInput,
  decodePendingRawInput,
} from '../toContract';
import { MEAL_CARD_ENTRY_SOURCES } from '../types';
import type { MealDraft } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';

function draft(name: string): MealDraft {
  return {
    id: 'draft-1',
    items: [
      {
        id: 'i1',
        food_name: name,
        portion_grams: 200,
        nutrient_source: 'usda_fdc',
        per_100g: { calories_kcal: 100, protein_g: 10, carbs_g: 8, fat_g: 4 },
        calories_kcal: 200,
        protein_g: 20,
        carbs_g: 16,
        fat_g: 8,
        fiber_g: 3,
        sugar_g: 2,
        micronutrients: { folate: 80, vitamin_d: 2 },
        user_modified: false,
        confidence_band: 'high',
      },
    ],
    totals: {
      calories_kcal: 200,
      protein_g: 20,
      carbs_g: 16,
      fat_g: 8,
      fiber_g: 3,
      sugar_g: 2,
      sodium_mg: 0,
      cholesterol_mg: 0,
    },
    meal_confidence: 0.82,
    warnings: [],
  };
}

describe('MealCard contract mapper', () => {
  it('accepts photo, upload, voice, dictation, and text', () => {
    expect([...MEAL_CARD_ENTRY_SOURCES]).toEqual([
      'photo',
      'upload',
      'voice',
      'dictation',
      'text',
    ]);
    for (const source of MEAL_CARD_ENTRY_SOURCES) {
      expect(isMealCardEntrySource(source)).toBe(true);
      const contract = contractFromDraft(draft('salmon'), source);
      expect(contract.source).toBe(source);
      expect(contract.foodNames).toEqual(['salmon']);
      expect(contract.micronutrients.folate).toBe(80);
    }
  });

  it('maps dictation onto the same analysis card as text', () => {
    const analysis = contractFromDraft(draft('eggs and spinach'), 'text').analysis;
    const fromDictation = contractFromAnalysis(analysis, 'dictation', {
      foodNames: ['eggs and spinach'],
    });
    const fromText = contractFromAnalysis(analysis, 'text', {
      foodNames: ['eggs and spinach'],
    });
    expect(fromDictation.analysis).toEqual(fromText.analysis);
    expect(fromDictation.servingDescription).toBe(fromText.servingDescription);
  });

  it('maps photo and upload to photo_ai logs and voice/text to manual_text', () => {
    expect(logSourceForEntry('photo')).toBe('photo_ai');
    expect(logSourceForEntry('upload')).toBe('photo_ai');
    expect(logSourceForEntry('voice')).toBe('manual_text');
    expect(logSourceForEntry('dictation')).toBe('manual_text');
    expect(logSourceForEntry('text')).toBe('manual_text');
  });

  it('round-trips dictation source through pending raw_input', () => {
    const contract = contractFromDraft(draft('eggs'), 'dictation');
    const encoded = encodePendingRawInput(contract);
    const fromString = decodePendingRawInput(encoded);
    const fromObject = decodePendingRawInput({
      meal_card_source: 'dictation',
      food_names: ['eggs'],
      micronutrients: { folate: 80 },
    });
    expect(fromString.meal_card_source).toBe('dictation');
    expect(fromString.food_names).toEqual(['eggs']);
    expect(fromObject.meal_card_source).toBe('dictation');
    expect(fromObject.micronutrients?.folate).toBe(80);
    expect(decodePendingRawInput('plain text meal')).toEqual({});
  });
});
