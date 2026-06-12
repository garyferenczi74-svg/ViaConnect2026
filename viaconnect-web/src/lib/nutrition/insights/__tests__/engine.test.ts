// Prompt 192 Task 2 (TDD first): engine end to end over the full week fixture.

import { describe, expect, it } from 'vitest';
import { runInsightEngine } from '../engine';
import { templateComposer } from '../compose';
import type { InsightComposer, InsightFact } from '../types';
import { fullWeekInput, mkMeal, NOW, YESTERDAY } from './fixtures';

const TYPES = [
  'macro_gap',
  'micronutrient_gap',
  'meal_timing_pattern',
  'hydration_correlation',
  'supplement_meal_alignment',
  'quality_trend',
  'consistency_streak',
  'score_mover',
];
const HORIZONS = ['meal', 'daily', 'weekly'];
const SEVERITIES = ['info', 'attention', 'positive'];
const CONFIDENCES = ['high', 'medium', 'low'];

describe('runInsightEngine', () => {
  it('produces persistable rows matching the DB enums with correct expiry math', async () => {
    const { insights, dropped } = await runInsightEngine(fullWeekInput(), templateComposer);
    expect(dropped).toEqual([]);
    expect(insights.length).toBe(8);

    const daily = insights.filter((r) => r.horizon === 'daily');
    const weekly = insights.filter((r) => r.horizon === 'weekly');
    expect(daily.length).toBe(3);
    expect(weekly.length).toBe(5);

    for (const row of insights) {
      expect(TYPES).toContain(row.insight_type);
      expect(HORIZONS).toContain(row.horizon);
      expect(SEVERITIES).toContain(row.severity);
      expect(CONFIDENCES).toContain(row.confidence);
      expect(row.compliance_passed).toBe(true);
      expect(typeof row.title).toBe('string');
      expect(typeof row.body).toBe('string');
      expect(typeof row.data_snapshot.factFingerprint).toBe('string');
      expect((row.data_snapshot.factFingerprint as string).length).toBeGreaterThan(0);
      if (row.horizon === 'daily') {
        expect(row.expires_at).toBe('2026-06-14T03:00:00.000Z');
      } else {
        expect(row.expires_at).toBe('2026-06-20T15:00:00.000Z');
      }
      if (row.insight_type !== 'micronutrient_gap') {
        expect(row.product_suggestion).toBeNull();
      }
    }

    const micro = insights.find((r) => r.insight_type === 'micronutrient_gap');
    expect(micro?.product_suggestion).toMatchObject({ slug: 'iron-support', name: 'Iron Support' });

    expect(NOW).toBe('2026-06-12T15:00:00.000Z');
  });

  it('returns compliance failing copy in the dropped list with reasons, never rewritten', async () => {
    const badComposer: InsightComposer = {
      compose: async (fact: InsightFact) =>
        fact.type === 'quality_trend'
          ? { title: 'Trend watch', body: 'this will cure your deficiency' }
          : null,
    };
    const { insights, dropped } = await runInsightEngine(fullWeekInput(), badComposer);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].fact.type).toBe('quality_trend');
    expect(dropped[0].body).toBe('this will cure your deficiency');
    expect(dropped[0].reasons.length).toBeGreaterThan(0);
    expect(insights).toHaveLength(7);
    expect(insights.find((r) => r.insight_type === 'quality_trend')).toBeUndefined();
  });

  it('falls back to the template composer when the injected composer throws', async () => {
    const throwingComposer: InsightComposer = {
      compose: async () => {
        throw new Error('llm offline');
      },
    };
    const { insights, dropped } = await runInsightEngine(fullWeekInput(), throwingComposer);
    expect(dropped).toEqual([]);
    expect(insights).toHaveLength(8);
  });

  it('ignores legacy meals with null qualityScore end to end', async () => {
    const input = fullWeekInput();
    input.scoredMeals.push(
      mkMeal({ date: YESTERDAY, qualityScore: null, itemNames: ['espresso'] }),
      mkMeal({ date: '2026-06-12', qualityScore: null }),
    );
    const { insights } = await runInsightEngine(input, templateComposer);
    expect(insights).toHaveLength(8);
    // The legacy espresso meal must not create an iron and caffeine interaction.
    const alignment = insights.filter((r) => r.insight_type === 'supplement_meal_alignment');
    expect(alignment).toHaveLength(1);
    expect((alignment[0].data_snapshot.interaction as { foodItem: string }).foodItem).toBe(
      'Greek Yogurt',
    );
    // The legacy meal today must not extend the streak.
    const streak = insights.find((r) => r.insight_type === 'consistency_streak');
    expect(streak?.data_snapshot.streakDays).toBe(7);
    expect(streak?.data_snapshot.endDate).toBe(YESTERDAY);
  });
});
