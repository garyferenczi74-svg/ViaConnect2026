import { describe, it, expect } from 'vitest';
import {
  recommendTier,
  recommendationSentence,
  TIER_DISPLAY_NAME,
} from '@/lib/membership/recommend-tier';

describe('recommendTier (169f Section 11.3)', () => {
  it('recommends platinum for weight-loss goals', () => {
    const r = recommendTier({ goals: ['Lose Weight'] });
    expect(r.tierId).toBe('platinum');
    expect(r.reason).toBe('body_composition');
  });

  it('recommends platinum for muscle-gain goals', () => {
    const r = recommendTier({ goals: ['Build Muscle', 'Increase Energy'] });
    expect(r.tierId).toBe('platinum');
    expect(r.reason).toBe('body_composition');
  });

  it('recommends platinum for aesthetic / body-composition goals', () => {
    expect(recommendTier({ goals: ['Anti-Aging'] }).tierId).toBe('platinum');
    expect(recommendTier({ goals: ['Athletic Performance'] }).tierId).toBe('platinum');
    expect(recommendTier({ goals: ['Skin & Hair Health'] }).tierId).toBe('platinum');
  });

  it('recommends gold for general wellness goals without a body-composition focus', () => {
    const r = recommendTier({ goals: ['Improve Sleep', 'Reduce Stress', 'Boost Immunity'] });
    expect(r.tierId).toBe('gold');
    expect(r.reason).toBe('general_wellness');
  });

  it('recommends free when no goals are selected (just evaluating)', () => {
    const r = recommendTier({ goals: [] });
    expect(r.tierId).toBe('free');
    expect(r.reason).toBe('evaluating');
  });

  it('recommends platinum_family when multiple household members are indicated', () => {
    const r = recommendTier({ goals: ['Improve Sleep'], householdMemberCount: 3 });
    expect(r.tierId).toBe('platinum_family');
    expect(r.reason).toBe('household');
  });

  it('household takes precedence over body-composition goals', () => {
    const r = recommendTier({ goals: ['Lose Weight'], householdMemberCount: 2 });
    expect(r.tierId).toBe('platinum_family');
  });

  it('single household member does not trigger the family tier', () => {
    expect(recommendTier({ goals: ['Lose Weight'], householdMemberCount: 1 }).tierId).toBe('platinum');
    expect(recommendTier({ goals: [], householdMemberCount: 1 }).tierId).toBe('free');
  });

  it('is case-insensitive and ignores blank / whitespace goals', () => {
    expect(recommendTier({ goals: ['  lose weight  '] }).tierId).toBe('platinum');
    expect(recommendTier({ goals: ['', '   '] }).tierId).toBe('free');
  });

  it('mixed wellness + body-composition still resolves to platinum', () => {
    const r = recommendTier({ goals: ['Improve Digestion', 'Lose Weight', 'Mood Support'] });
    expect(r.tierId).toBe('platinum');
  });
});

describe('recommendationSentence + display names (169f Section 11.3 locked copy)', () => {
  it('uses the locked string with the tier display name substituted', () => {
    expect(recommendationSentence('gold')).toBe(
      'Based on your goals, Gold looks like the best fit for you.',
    );
    expect(recommendationSentence('platinum')).toBe(
      'Based on your goals, Platinum looks like the best fit for you.',
    );
    expect(recommendationSentence('free')).toBe(
      'Based on your goals, Free looks like the best fit for you.',
    );
    expect(recommendationSentence('platinum_family')).toBe(
      'Based on your goals, Platinum+ Family looks like the best fit for you.',
    );
  });

  it('family tier display name matches the DB display_name', () => {
    expect(TIER_DISPLAY_NAME.platinum_family).toBe('Platinum+ Family');
  });
});
