import { describe, it, expect } from 'vitest';
import { NutritionAnalysisSchema, DataSourceSchema } from '../schema';

describe('DataSourceSchema', () => {
  it.each(['usda', 'gemini_fallback', 'mixed', 'manual'])('accepts %s', (v) => {
    expect(DataSourceSchema.safeParse(v).success).toBe(true);
  });
  it('rejects unknown values', () => {
    expect(DataSourceSchema.safeParse('claude').success).toBe(false);
  });
});

describe('NutritionAnalysisSchema with data_source', () => {
  const base = {
    calories: 200, protein_g: 10, carbs_g: 20, total_fat_g: 8,
    good_fat_g: 4, healthy_fat_g: 1, saturated_fat_g: 3,
    sugar_g: 5, fiber_g: 3,
    confidence: 0.9, ai_notes: 'ok', serving_description: 'one egg',
  };
  it('accepts an object without data_source (back-compat)', () => {
    expect(NutritionAnalysisSchema.safeParse(base).success).toBe(true);
  });
  it('accepts an object with data_source=usda', () => {
    expect(NutritionAnalysisSchema.safeParse({ ...base, data_source: 'usda' }).success).toBe(true);
  });
  it('rejects an object with data_source=foo', () => {
    expect(NutritionAnalysisSchema.safeParse({ ...base, data_source: 'foo' }).success).toBe(false);
  });
});
