// Prompt #104 Phase 1: Bucket classifier + template-compatibility tests.
//
// Critical hard-stop tests from spec §15:
//   - MAP-only bucket cannot select trademark / counterfeit templates
//   - Counterfeit allegations require physical-product evidence
//   - Material-differences allegations require documented differences

import { describe, it, expect } from 'vitest';
import {
  isTemplateCompatibleWithBucket,
  bucketSupportsIPEnforcement,
  recommendedTemplateFamilyForBucket,
} from '@/lib/legal/bucketClassifier';

describe('isTemplateCompatibleWithBucket — bucket gating', () => {
  it('blocks counterfeit C&D for a MAP-only case (HARD STOP)', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'cd_counterfeit',
      bucket: 'map_only',
    })).toEqual({ ok: false, reason: 'template_not_compatible' });
  });

  it('blocks material-differences C&D for a MAP-only case', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'cd_material_differences',
      bucket: 'map_only',
    })).toEqual({ ok: false, reason: 'template_not_compatible' });
  });

  it('blocks material-differences C&D for a gray-market-no-differences case (no IP claim)', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'cd_material_differences',
      bucket: 'gray_market_no_differences',
    })).toEqual({ ok: false, reason: 'template_not_compatible' });
  });

  it('blocks any template selection while bucket is unclassified', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'cd_map_policy_breach',
      bucket: 'unclassified',
    })).toEqual({ ok: false, reason: 'unclassified_bucket' });
  });

  it('allows MAP policy breach C&D for a MAP-only case', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'cd_map_policy_breach',
      bucket: 'map_only',
    })).toEqual({ ok: true });
  });

  it('allows counterfeit C&D for a counterfeit case', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'cd_counterfeit',
      bucket: 'counterfeit',
    })).toEqual({ ok: true });
  });

  it('allows distribution breach C&D for gray_market_no_differences (ex-wholesaler)', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'cd_distribution_breach',
      bucket: 'gray_market_no_differences',
    })).toEqual({ ok: true });
  });

  it('allows DMCA on Amazon for gray_market_material_differences', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'dmca_takedown_amazon',
      bucket: 'gray_market_material_differences',
    })).toEqual({ ok: true });
  });

  it('blocks Amazon Brand Registry complaint for gray_market_no_differences', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'marketplace_complaint_amazon_brand_registry',
      bucket: 'gray_market_no_differences',
    })).toEqual({ ok: false, reason: 'template_not_compatible' });
  });

  it('blocks Amazon Brand Registry complaint for MAP-only case (HARD STOP)', () => {
    expect(isTemplateCompatibleWithBucket({
      template_family: 'marketplace_complaint_amazon_brand_registry',
      bucket: 'map_only',
    })).toEqual({ ok: false, reason: 'template_not_compatible' });
  });
});

describe('bucketSupportsIPEnforcement — evidence gating', () => {
  it('blocks counterfeit IP enforcement without physical-product evidence (HARD STOP)', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'counterfeit',
      evidence_artifact_types: ['page_screenshot', 'html_snapshot', 'pricing_capture'],
      documented_material_differences_count: 0,
    })).toEqual({ ok: false, reason: 'counterfeit_requires_physical_evidence' });
  });

  it('allows counterfeit IP enforcement with test-purchase receipt', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'counterfeit',
      evidence_artifact_types: ['test_purchase_receipt'],
      documented_material_differences_count: 0,
    })).toEqual({ ok: true });
  });

  it('allows counterfeit IP enforcement with lab report', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'counterfeit',
      evidence_artifact_types: ['page_screenshot', 'lab_report'],
      documented_material_differences_count: 0,
    })).toEqual({ ok: true });
  });

  it('allows counterfeit IP enforcement with customer complaint photo', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'counterfeit',
      evidence_artifact_types: ['customer_complaint'],
      documented_material_differences_count: 0,
    })).toEqual({ ok: true });
  });

  it('blocks material-differences IP enforcement without documented differences', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'gray_market_material_differences',
      evidence_artifact_types: ['page_screenshot'],
      documented_material_differences_count: 0,
    })).toEqual({ ok: false, reason: 'material_differences_requires_documented_diffs' });
  });

  it('allows material-differences IP enforcement with at least one documented diff', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'gray_market_material_differences',
      evidence_artifact_types: ['page_screenshot'],
      documented_material_differences_count: 1,
    })).toEqual({ ok: true });
  });

  it('blocks IP enforcement for MAP-only bucket (unenforceable)', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'map_only',
      evidence_artifact_types: ['test_purchase_receipt'],
      documented_material_differences_count: 5,
    })).toEqual({ ok: false, reason: 'unenforceable_bucket' });
  });

  it('blocks IP enforcement for gray_market_no_differences bucket', () => {
    expect(bucketSupportsIPEnforcement({
      bucket: 'gray_market_no_differences',
      evidence_artifact_types: ['test_purchase_receipt'],
      documented_material_differences_count: 5,
    })).toEqual({ ok: false, reason: 'unenforceable_bucket' });
  });
});

describe('recommendedTemplateFamilyForBucket', () => {
  it('returns cd_counterfeit for counterfeit', () => {
    expect(recommendedTemplateFamilyForBucket('counterfeit')).toBe('cd_counterfeit');
  });
  it('returns cd_material_differences for gray_market_material_differences', () => {
    expect(recommendedTemplateFamilyForBucket('gray_market_material_differences')).toBe('cd_material_differences');
  });
  it('returns cd_distribution_breach for gray_market_no_differences', () => {
    expect(recommendedTemplateFamilyForBucket('gray_market_no_differences')).toBe('cd_distribution_breach');
  });
  it('returns cd_map_policy_breach for map_only', () => {
    expect(recommendedTemplateFamilyForBucket('map_only')).toBe('cd_map_policy_breach');
  });
  it('returns null for unclassified', () => {
    expect(recommendedTemplateFamilyForBucket('unclassified')).toBe(null);
  });
});
