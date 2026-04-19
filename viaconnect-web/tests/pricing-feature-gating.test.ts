import { describe, it, expect } from 'vitest';
import { evaluateFeatureAccess, accessibleFeatureIds } from '@/lib/pricing/feature-gating';
import type { FeatureRow } from '@/types/pricing';

const FEATURES: FeatureRow[] = [
  { id: 'caq_assessment',       display_name: 'CAQ',                    description: null, category: 'assessment',      minimum_tier_level: 0, requires_family_tier: false, requires_genex360: false, gate_behavior: 'hide',           is_active: true, created_at: new Date().toISOString() },
  { id: 'hannah_unlimited',     display_name: 'Unlimited Hannah',       description: null, category: 'ai_coaching',     minimum_tier_level: 1, requires_family_tier: false, requires_genex360: false, gate_behavior: 'preview',        is_active: true, created_at: new Date().toISOString() },
  { id: 'full_precision_score', display_name: '96% Confidence',         description: null, category: 'personalization', minimum_tier_level: 2, requires_family_tier: false, requires_genex360: true,  gate_behavior: 'preview',        is_active: true, created_at: new Date().toISOString() },
  { id: 'family_dashboard',     display_name: 'Family Dashboard',       description: null, category: 'family',          minimum_tier_level: 3, requires_family_tier: true,  requires_genex360: false, gate_behavior: 'upgrade_prompt', is_active: true, created_at: new Date().toISOString() },
];

describe('evaluateFeatureAccess', () => {
  it('free user can access level 0 features only', () => {
    expect(evaluateFeatureAccess(FEATURES, 'free', 'caq_assessment').hasAccess).toBe(true);
    expect(evaluateFeatureAccess(FEATURES, 'free', 'hannah_unlimited').hasAccess).toBe(false);
    expect(evaluateFeatureAccess(FEATURES, 'free', 'full_precision_score').hasAccess).toBe(false);
    expect(evaluateFeatureAccess(FEATURES, 'free', 'family_dashboard').hasAccess).toBe(false);
  });

  it('gold user covers 0-1', () => {
    expect(evaluateFeatureAccess(FEATURES, 'gold', 'caq_assessment').hasAccess).toBe(true);
    expect(evaluateFeatureAccess(FEATURES, 'gold', 'hannah_unlimited').hasAccess).toBe(true);
    expect(evaluateFeatureAccess(FEATURES, 'gold', 'full_precision_score').hasAccess).toBe(false);
  });

  it('platinum user covers 0-2', () => {
    expect(evaluateFeatureAccess(FEATURES, 'platinum', 'full_precision_score').hasAccess).toBe(true);
    expect(evaluateFeatureAccess(FEATURES, 'platinum', 'family_dashboard').hasAccess).toBe(false);
  });

  it('platinum_family user covers everything including family-only features', () => {
    expect(evaluateFeatureAccess(FEATURES, 'platinum_family', 'family_dashboard').hasAccess).toBe(true);
    expect(evaluateFeatureAccess(FEATURES, 'platinum_family', 'full_precision_score').hasAccess).toBe(true);
  });

  it('returns the gate_behavior even when access is denied', () => {
    const r = evaluateFeatureAccess(FEATURES, 'free', 'hannah_unlimited');
    expect(r.hasAccess).toBe(false);
    expect(r.gateBehavior).toBe('preview');
    expect(r.requiredTierLevel).toBe(1);
  });

  it('throws on unknown feature id', () => {
    expect(() => evaluateFeatureAccess(FEATURES, 'gold', 'made_up_id')).toThrow(/Unknown feature/);
  });
});

describe('accessibleFeatureIds', () => {
  it('free: only level-0', () => {
    expect(accessibleFeatureIds(FEATURES, 'free')).toEqual(['caq_assessment']);
  });
  it('gold: levels 0-1', () => {
    const ids = accessibleFeatureIds(FEATURES, 'gold');
    expect(ids).toContain('caq_assessment');
    expect(ids).toContain('hannah_unlimited');
    expect(ids).not.toContain('full_precision_score');
  });
  it('platinum_family: all', () => {
    expect(accessibleFeatureIds(FEATURES, 'platinum_family')).toHaveLength(4);
  });
});
