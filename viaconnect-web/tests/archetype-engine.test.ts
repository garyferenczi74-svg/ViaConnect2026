// Prompt #94 Phase 5: Archetype classification tests.

import { describe, it, expect } from 'vitest';
import {
  scoreArchetypes,
  classifyFromSignals,
  ARCHETYPE_IDS,
  type CAQSignal,
  type BehavioralSignal,
} from '@/lib/analytics/archetype-engine';
import {
  shouldUpdatePrimaryArchetype,
  REFINEMENT_CONFIDENCE_GAP,
} from '@/lib/analytics/behavioral-refinement';

function caq(over: Partial<CAQSignal> = {}): CAQSignal {
  return {
    age_years: 35,
    biological_sex: 'female',
    primary_goals: [],
    current_conditions: [],
    diet_type: null,
    exercise_frequency: null,
    stress_level: null,
    previous_herbal_experience: null,
    has_dependent_minors: false,
    education_level: null,
    income_band: null,
    ...over,
  };
}

describe('ARCHETYPE_IDS', () => {
  it('exposes the 7 spec archetypes', () => {
    expect(new Set(ARCHETYPE_IDS)).toEqual(new Set([
      'precision_wellness_seeker',
      'biohacker_optimizer',
      'chronic_condition_navigator',
      'preventive_health_parent',
      'performance_athlete',
      'longevity_investor',
      'genetic_curious_explorer',
    ]));
  });
});

describe('scoreArchetypes (CAQ only)', () => {
  it('precision_wellness_seeker scores high for educated 30-50 with personalization signals', () => {
    const scores = scoreArchetypes({
      caq: caq({
        age_years: 38,
        primary_goals: ['optimize_wellness', 'longevity'],
        education_level: 'graduate',
      }),
    });
    expect(scores.precision_wellness_seeker).toBeGreaterThan(0.4);
  });

  it('biohacker_optimizer scores high for young male with performance + cognition goals', () => {
    const scores = scoreArchetypes({
      caq: caq({
        age_years: 32,
        biological_sex: 'male',
        primary_goals: ['cognition', 'performance'],
        exercise_frequency: 'daily',
      }),
    });
    expect(scores.biohacker_optimizer).toBeGreaterThan(0.4);
  });

  it('chronic_condition_navigator scores high when current_conditions is non-empty', () => {
    const scores = scoreArchetypes({
      caq: caq({
        age_years: 50,
        current_conditions: ['autoimmune', 'gut_health'],
        primary_goals: ['symptom_relief'],
      }),
    });
    expect(scores.chronic_condition_navigator).toBeGreaterThan(0.4);
  });

  it('preventive_health_parent scores high when has_dependent_minors and family-wellness goals', () => {
    const scores = scoreArchetypes({
      caq: caq({
        age_years: 38,
        has_dependent_minors: true,
        primary_goals: ['family_wellness', 'prevention'],
      }),
    });
    expect(scores.preventive_health_parent).toBeGreaterThan(0.4);
  });

  it('performance_athlete scores high with daily exercise + performance/recovery goals', () => {
    const scores = scoreArchetypes({
      caq: caq({
        age_years: 28,
        exercise_frequency: 'daily',
        primary_goals: ['performance', 'recovery'],
      }),
    });
    expect(scores.performance_athlete).toBeGreaterThan(0.4);
  });

  it('longevity_investor scores high for affluent 45+ with longevity goals', () => {
    const scores = scoreArchetypes({
      caq: caq({
        age_years: 52,
        primary_goals: ['longevity', 'healthspan'],
        income_band: 'over_500k',
      }),
    });
    expect(scores.longevity_investor).toBeGreaterThan(0.4);
  });

  it('genetic_curious_explorer scores high when only genetic-curiosity signals present', () => {
    const scores = scoreArchetypes({
      caq: caq({
        age_years: 40,
        primary_goals: ['genetic_insight', 'curiosity'],
      }),
    });
    expect(scores.genetic_curious_explorer).toBeGreaterThan(0.3);
  });

  it('every archetype score is between 0 and 1', () => {
    const scores = scoreArchetypes({ caq: caq() });
    for (const id of ARCHETYPE_IDS) {
      expect(scores[id]).toBeGreaterThanOrEqual(0);
      expect(scores[id]).toBeLessThanOrEqual(1);
    }
  });
});

describe('classifyFromSignals', () => {
  it('returns primary, secondary, and confidence', () => {
    const r = classifyFromSignals({
      caq: caq({
        age_years: 38,
        biological_sex: 'female',
        primary_goals: ['optimize_wellness', 'data'],
        education_level: 'graduate',
      }),
    });
    expect(r.primary.archetype_id).toBe('precision_wellness_seeker');
    expect(r.secondary).toHaveLength(2);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it('confidence is the gap between primary and runner-up', () => {
    const r = classifyFromSignals({
      caq: caq({
        age_years: 50,
        current_conditions: ['autoimmune'],
        primary_goals: ['symptom_relief', 'root_cause'],
      }),
    });
    expect(r.confidence).toBe(
      Number((r.primary.score - r.secondary[0].score).toFixed(3)),
    );
  });

  it('behavioral signals can shift the primary when CAQ-only is ambiguous', () => {
    const ambiguousCaq = caq({
      age_years: 42,
      primary_goals: [],
    });

    const beforeBehavior = classifyFromSignals({ caq: ambiguousCaq });
    const afterBehavior = classifyFromSignals({
      caq: ambiguousCaq,
      behavior: behaviorSignal({
        platinum_subscription: true,
        genex360_complete_purchased: true,
        avg_monthly_aov_cents: 35_000,
        protocol_adherence_rate: 0.9,
      }),
    });

    expect(afterBehavior.primary.score).toBeGreaterThan(beforeBehavior.primary.score);
  });

  it('signal_payload mirrors the inputs for audit trail', () => {
    const input = caq({ age_years: 30, primary_goals: ['cognition'] });
    const r = classifyFromSignals({ caq: input });
    expect(r.signal_payload).toMatchObject({
      caq: expect.objectContaining({ age_years: 30 }),
    });
  });
});

describe('shouldUpdatePrimaryArchetype', () => {
  it('exposes the documented gap threshold (0.15)', () => {
    expect(REFINEMENT_CONFIDENCE_GAP).toBe(0.15);
  });

  it('does not update when refined primary equals current primary', () => {
    const r = shouldUpdatePrimaryArchetype({
      currentPrimaryId: 'biohacker_optimizer',
      currentConfidence: 0.2,
      refinedPrimaryId: 'biohacker_optimizer',
      refinedScore: 0.7,
      refinedRunnerUpScore: 0.4,
    });
    expect(r.update).toBe(false);
    expect(r.reason).toMatch(/same/i);
  });

  it('updates when refined primary differs AND confidence gap exceeds threshold', () => {
    const r = shouldUpdatePrimaryArchetype({
      currentPrimaryId: 'biohacker_optimizer',
      currentConfidence: 0.05,
      refinedPrimaryId: 'longevity_investor',
      refinedScore: 0.85,
      refinedRunnerUpScore: 0.50,  // gap = 0.35 > 0.15
    });
    expect(r.update).toBe(true);
  });

  it('does NOT update when gap is too small even if primary differs', () => {
    const r = shouldUpdatePrimaryArchetype({
      currentPrimaryId: 'biohacker_optimizer',
      currentConfidence: 0.05,
      refinedPrimaryId: 'longevity_investor',
      refinedScore: 0.55,
      refinedRunnerUpScore: 0.45, // gap = 0.10 < 0.15
    });
    expect(r.update).toBe(false);
    expect(r.reason).toMatch(/below threshold/i);
  });
});

function behaviorSignal(over: Partial<BehavioralSignal> = {}): BehavioralSignal {
  return {
    platinum_subscription: false,
    family_subscription: false,
    genex360_complete_purchased: false,
    genex360_core_purchased: false,
    avg_monthly_aov_cents: 0,
    protocol_adherence_rate: 0,
    practitioner_attached: false,
    distinct_supplement_categories: 0,
    days_since_signup: 90,
    ...over,
  };
}
