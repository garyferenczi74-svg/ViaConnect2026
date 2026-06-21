/**
 * TDD test suite for nutritionByGenetics.ts (Prompt 208 Phase 5 Task 14).
 * Written RED first; goes GREEN after the helper + fenced blocks are added.
 *
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';

// These imports will fail (RED) until the files exist.
import {
  nutritionByGeneticsFromRules,
  type NutritionByGenetics,
} from '../nutritionByGenetics';
import { GORDON_TASKS } from '../taskRegistry';
import { GORDON_208_TASKS } from '../taskRegistry';
import {
  GORDON_SYSTEM_PROMPT,
  GORDON_208_NUTRITION_BY_GENETICS_PROMPT,
} from '../systemPrompt';
import type { SnpProtocolRule } from '@/lib/kb/snpProtocolRules';

// ---------------------------------------------------------------------------
// Helper to build a minimal SnpProtocolRule for testing.
// ---------------------------------------------------------------------------
function makeRule(overrides: Partial<SnpProtocolRule>): SnpProtocolRule {
  return {
    id: 'test-id',
    rsid: 'rs0000000',
    gene: 'TEST',
    genotype_match: 'AA',
    action_type: 'prefer_form',
    review_status: 'published',
    created_at: '2026-06-21T00:00:00Z',
    sensitive: false,
    ...overrides,
  } as SnpProtocolRule;
}

// ---------------------------------------------------------------------------
// 1. nutritionByGeneticsFromRules -- core logic
// ---------------------------------------------------------------------------
describe('nutritionByGeneticsFromRules', () => {
  it('MTHFR rule: prefer contains L-methylfolate; avoid contains folic-acid-fortified grains', () => {
    const rule = makeRule({
      rsid: 'rs1801133',
      gene: 'MTHFR',
      action_type: 'prefer_form',
      recommended_form: 'L-methylfolate',
      avoid_list: ['folic-acid-fortified grains'],
    });
    const result: NutritionByGenetics = nutritionByGeneticsFromRules([rule]);
    expect(result.prefer).toContain('L-methylfolate');
    expect(result.avoid).toContain('folic-acid-fortified grains');
  });

  it('BCO1 rule: prefer contains preformed vitamin A (retinol)', () => {
    const rule = makeRule({
      rsid: 'rs12934922',
      gene: 'BCO1',
      action_type: 'dose_context',
      recommended_form: 'preformed vitamin A (retinol)',
    });
    const result = nutritionByGeneticsFromRules([rule]);
    expect(result.prefer).toContain('preformed vitamin A (retinol)');
  });

  it('contraindicate rule: flagged_form is added to avoid', () => {
    const rule = makeRule({
      rsid: 'rs1800562',
      gene: 'HFE',
      action_type: 'contraindicate',
      flagged_form: 'iron',
      avoid_list: ['iron supplements'],
    });
    const result = nutritionByGeneticsFromRules([rule]);
    expect(result.avoid).toContain('iron');
    expect(result.avoid).toContain('iron supplements');
  });

  it('deduplicates repeated prefer values', () => {
    const rule1 = makeRule({
      rsid: 'rs1801133',
      gene: 'MTHFR',
      genotype_match: 'TT',
      action_type: 'prefer_form',
      recommended_form: 'L-methylfolate',
    });
    const rule2 = makeRule({
      rsid: 'rs1801131',
      gene: 'MTHFR',
      genotype_match: 'CC',
      action_type: 'prefer_form',
      recommended_form: 'L-methylfolate',
    });
    const result = nutritionByGeneticsFromRules([rule1, rule2]);
    const count = result.prefer.filter((v) => v === 'L-methylfolate').length;
    expect(count).toBe(1);
  });

  it('deduplicates repeated avoid values', () => {
    const rule1 = makeRule({
      rsid: 'rs1801133',
      gene: 'MTHFR',
      genotype_match: 'TT',
      action_type: 'prefer_form',
      avoid_list: ['folic-acid-fortified grains'],
    });
    const rule2 = makeRule({
      rsid: 'rs1801131',
      gene: 'MTHFR',
      genotype_match: 'CC',
      action_type: 'prefer_form',
      avoid_list: ['folic-acid-fortified grains'],
    });
    const result = nutritionByGeneticsFromRules([rule1, rule2]);
    const count = result.avoid.filter((v) => v === 'folic-acid-fortified grains').length;
    expect(count).toBe(1);
  });

  it('returns empty arrays for empty rules input', () => {
    const result = nutritionByGeneticsFromRules([]);
    expect(result.prefer).toEqual([]);
    expect(result.avoid).toEqual([]);
  });

  it('rule without recommended_form does not add undefined to prefer', () => {
    const rule = makeRule({ action_type: 'monitor_biomarker' });
    const result = nutritionByGeneticsFromRules([rule]);
    expect(result.prefer.includes(undefined as unknown as string)).toBe(false);
  });

  it('rule without avoid_list and without flagged_form adds nothing to avoid', () => {
    const rule = makeRule({
      action_type: 'prefer_form',
      recommended_form: 'methylcobalamin',
    });
    const result = nutritionByGeneticsFromRules([rule]);
    expect(result.avoid).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Fence markers present exactly once in each file
// ---------------------------------------------------------------------------
describe('fence markers', () => {
  it('taskRegistry.ts contains EXTENSION START marker exactly once', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../taskRegistry.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8',
    );
    const matches = (content.match(/PROMPT 208 EXTENSION START/g) ?? []).length;
    expect(matches).toBe(1);
  });

  it('taskRegistry.ts contains EXTENSION END marker exactly once', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../taskRegistry.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8',
    );
    const matches = (content.match(/PROMPT 208 EXTENSION END/g) ?? []).length;
    expect(matches).toBe(1);
  });

  it('systemPrompt.ts contains EXTENSION START marker exactly once', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../systemPrompt.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8',
    );
    const matches = (content.match(/PROMPT 208 EXTENSION START/g) ?? []).length;
    expect(matches).toBe(1);
  });

  it('systemPrompt.ts contains EXTENSION END marker exactly once', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../systemPrompt.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8',
    );
    const matches = (content.match(/PROMPT 208 EXTENSION END/g) ?? []).length;
    expect(matches).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. GORDON_208_TASKS shape
// ---------------------------------------------------------------------------
describe('GORDON_208_TASKS', () => {
  it('NUTRITION_BY_GENETICS equals nutrition_by_genetics', () => {
    expect(GORDON_208_TASKS.NUTRITION_BY_GENETICS).toBe('nutrition_by_genetics');
  });
});

// ---------------------------------------------------------------------------
// 4. GORDON_208_NUTRITION_BY_GENETICS_PROMPT shape
// ---------------------------------------------------------------------------
describe('GORDON_208_NUTRITION_BY_GENETICS_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof GORDON_208_NUTRITION_BY_GENETICS_PROMPT).toBe('string');
    expect(GORDON_208_NUTRITION_BY_GENETICS_PROMPT.trim().length).toBeGreaterThan(0);
  });

  it('mentions MTHFR', () => {
    expect(GORDON_208_NUTRITION_BY_GENETICS_PROMPT).toContain('MTHFR');
  });

  it('contains a no-diagnosis or practitioner phrase', () => {
    const lower = GORDON_208_NUTRITION_BY_GENETICS_PROMPT.toLowerCase();
    const hasPhrases =
      lower.includes('practitioner') ||
      lower.includes('no diagnosis') ||
      lower.includes('not a diagnosis') ||
      lower.includes('medical decisions');
    expect(hasPhrases).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Existing exports unchanged (additive-only proof)
// ---------------------------------------------------------------------------
describe('existing Gordon exports unchanged', () => {
  it('GORDON_TASKS still has MEAL_VISION_ANALYSIS', () => {
    expect(GORDON_TASKS.MEAL_VISION_ANALYSIS).toBe('meal_vision_analysis');
  });

  it('GORDON_TASKS still has NUTRITION_INSIGHT', () => {
    expect(GORDON_TASKS.NUTRITION_INSIGHT).toBe('nutrition_insight');
  });

  it('GORDON_TASKS still has FOOD_INTERACTION_CHECK', () => {
    expect(GORDON_TASKS.FOOD_INTERACTION_CHECK).toBe('food_interaction_check');
  });

  it('GORDON_TASKS still has MEAL_QUALITY_SCORE', () => {
    expect(GORDON_TASKS.MEAL_QUALITY_SCORE).toBe('meal_quality_score');
  });

  it('GORDON_TASKS still has FARMCEUTICA_GAP_MATCH', () => {
    expect(GORDON_TASKS.FARMCEUTICA_GAP_MATCH).toBe('farmceutica_gap_match');
  });

  it('GORDON_TASKS still has NEXT_MEAL_SUGGESTION', () => {
    expect(GORDON_TASKS.NEXT_MEAL_SUGGESTION).toBe('next_meal_suggestion');
  });

  it('GORDON_TASKS still has DAILY_NUTRITION_SUMMARY', () => {
    expect(GORDON_TASKS.DAILY_NUTRITION_SUMMARY).toBe('daily_nutrition_summary');
  });

  it('GORDON_TASKS still has WEEKLY_PATTERN_ANALYSIS', () => {
    expect(GORDON_TASKS.WEEKLY_PATTERN_ANALYSIS).toBe('weekly_pattern_analysis');
  });

  it('GORDON_TASKS still has MEAL_PLAN_SUGGESTION', () => {
    expect(GORDON_TASKS.MEAL_PLAN_SUGGESTION).toBe('meal_plan_suggestion');
  });

  it('GORDON_TASKS still has NUTRIENT_DEEP_DIVE', () => {
    expect(GORDON_TASKS.NUTRIENT_DEEP_DIVE).toBe('nutrient_deep_dive');
  });

  it('GORDON_TASKS still has DIETARY_ADJUSTMENT', () => {
    expect(GORDON_TASKS.DIETARY_ADJUSTMENT).toBe('dietary_adjustment');
  });

  it('GORDON_SYSTEM_PROMPT still contains "10 to 28x" phrase', () => {
    expect(GORDON_SYSTEM_PROMPT).toContain('10 to 28x');
  });

  it('GORDON_SYSTEM_PROMPT still contains "NEVER recommend Semaglutide" phrase', () => {
    expect(GORDON_SYSTEM_PROMPT).toContain('NEVER recommend Semaglutide');
  });
});
