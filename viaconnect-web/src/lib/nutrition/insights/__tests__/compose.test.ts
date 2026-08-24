// Prompt 192 Task 2 (TDD first): composition layer tests.
// templateComposer is deterministic and dash free; claudeComposer returns
// null on ANY failure so the engine can fall back to the template.

import { describe, expect, it } from 'vitest';
import { claudeComposer, templateComposer } from '../compose';
import { lintInsightCopy } from '../compliance';
import type { InsightFact } from '../types';
import { mkFact } from './fixtures';

const EM_DASH = String.fromCharCode(8212);
const EN_DASH = String.fromCharCode(8211);

const REPRESENTATIVE_FACTS: InsightFact[] = [
  mkFact({
    type: 'macro_gap',
    horizon: 'daily',
    severity: 'attention',
    snapshot: {
      scope: 'daily',
      date: '2026-06-11',
      macro: 'protein',
      actualG: 55,
      targetG: 120,
      attainmentPct: 46,
      mealsCount: 2,
      coveredMacros: ['protein'],
      magnitudePct: 54,
    },
  }),
  mkFact({
    type: 'macro_gap',
    horizon: 'weekly',
    snapshot: {
      scope: 'weekly',
      macro: 'fiber',
      gapDays: 5,
      coveredDays: 7,
      windowDays: 7,
      avgAttainmentPct: 62,
      targetG: 30,
      magnitudePct: 38,
    },
  }),
  mkFact({
    type: 'micronutrient_gap',
    horizon: 'weekly',
    snapshot: {
      nutrientKey: 'iron_mg',
      nutrientLabel: 'iron',
      unit: 'mg',
      gapDays: 5,
      coveredDays: 7,
      windowDays: 7,
      avgIntake: 9,
      referenceIntake: 18,
      magnitudePct: 50,
    },
    productSuggestion: { slug: 'iron-support', name: 'Iron Support', reason: 'recurring gap' },
  }),
  mkFact({
    type: 'meal_timing_pattern',
    horizon: 'weekly',
    snapshot: {
      pattern: 'late_eating',
      patternDays: 4,
      daysWithMeals: 7,
      windowDays: 7,
      magnitudePct: 57,
    },
  }),
  mkFact({
    type: 'hydration_correlation',
    horizon: 'weekly',
    snapshot: {
      scope: 'weekly',
      avgAttainmentPct: 60,
      daysBelowTarget: 5,
      coveredDays: 7,
      windowDays: 7,
      coOccurrence: { lowHydrationLowQualityDays: 3, comparedDays: 7 },
      framing: 'correlational',
      magnitudePct: 40,
    },
  }),
  mkFact({
    type: 'supplement_meal_alignment',
    horizon: 'daily',
    snapshot: {
      scope: 'daily',
      date: '2026-06-11',
      kind: 'interaction',
      interaction: {
        foodItem: 'Greek Yogurt',
        interactsWith: 'Iron Bisglycinate',
        interactionType: 'absorption',
        severity: 'caution',
        description: 'Calcium competes with iron for absorption',
        recommendation: 'Separate iron supplements and dairy by 2 hours',
      },
      magnitudePct: 50,
    },
  }),
  mkFact({
    type: 'quality_trend',
    horizon: 'weekly',
    severity: 'positive',
    snapshot: {
      trend: 'improving',
      firstHalfAvg: 55,
      secondHalfAvg: 75,
      deltaPts: 20,
      scoredDays: 6,
      windowDays: 7,
      contributor: { macro: 'protein', deltaPct: 42 },
      magnitudePct: 20,
    },
  }),
  mkFact({
    type: 'consistency_streak',
    horizon: 'daily',
    severity: 'positive',
    snapshot: { streakDays: 5, endDate: '2026-06-11', magnitudePct: 50 },
  }),
  mkFact({
    type: 'score_mover',
    horizon: 'weekly',
    snapshot: {
      winnerType: 'macro_gap',
      winnerFingerprint: 'fp_macro',
      winnerSnapshot: { macro: 'protein' },
      candidatesConsidered: 4,
      magnitudePct: 40,
    },
  }),
];

describe('templateComposer', () => {
  it('writes dash free copy for every insight type', async () => {
    for (const fact of REPRESENTATIVE_FACTS) {
      const copy = await templateComposer.compose(fact);
      expect(copy).not.toBeNull();
      const text = `${copy!.title} ${copy!.body}`;
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toContain(EN_DASH);
      expect(text).not.toContain('-');
      expect(copy!.title.length).toBeGreaterThan(0);
      expect(copy!.body.length).toBeGreaterThan(0);
    }
  });

  it('embeds the fact numbers verbatim for a daily macro gap', async () => {
    const copy = await templateComposer.compose(REPRESENTATIVE_FACTS[0]);
    const text = `${copy!.title} ${copy!.body}`;
    expect(text).toContain('55');
    expect(text).toContain('120');
    expect(text).toContain('46');
  });

  it('always passes the compliance gate for every type', async () => {
    for (const fact of REPRESENTATIVE_FACTS) {
      const copy = await templateComposer.compose(fact);
      const lint = lintInsightCopy(copy!.title, copy!.body, fact);
      expect(lint.failures).toEqual([]);
    }
  });
});

describe('claudeComposer', () => {
  const fact = REPRESENTATIVE_FACTS[0];

  it('returns parsed copy from a well behaved injected client', async () => {
    const client = {
      messages: {
        create: async () => ({
          content: [
            { type: 'text', text: '{"title":"Protein check","body":"You logged 55 g against 120 g."}' },
          ],
        }),
      },
    };
    const composer = claudeComposer(client);
    const copy = await composer.compose(fact);
    expect(copy).toEqual({ title: 'Protein check', body: 'You logged 55 g against 120 g.' });
  });

  it('returns null when the injected client rejects', async () => {
    const client = {
      messages: {
        create: async () => {
          throw new Error('network down');
        },
      },
    };
    const copy = await claudeComposer(client).compose(fact);
    expect(copy).toBeNull();
  });

  it('returns null on malformed JSON output', async () => {
    const client = {
      messages: { create: async () => ({ content: [{ type: 'text', text: 'not json' }] }) },
    };
    expect(await claudeComposer(client).compose(fact)).toBeNull();
  });

  it('returns null when fields are missing', async () => {
    const client = {
      messages: { create: async () => ({ content: [{ type: 'text', text: '{"title":"only"}' }] }) },
    };
    expect(await claudeComposer(client).compose(fact)).toBeNull();
  });

  it('sends a small max_tokens and a system prompt locking the bioavailability string', async () => {
    let captured: { max_tokens?: number; system?: string } = {};
    const client = {
      messages: {
        create: async (args: { max_tokens: number; system: string }) => {
          captured = args;
          return { content: [{ type: 'text', text: '{"title":"t","body":"b"}' }] };
        },
      },
    };
    await claudeComposer(client).compose(fact);
    expect(captured.max_tokens).toBeLessThanOrEqual(400);
    expect(captured.system).toContain('Maximum Bioavailability');
    expect(captured.system).toContain('Never invent');
  });
});
