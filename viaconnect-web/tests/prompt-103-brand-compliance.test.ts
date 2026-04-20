// Prompt #103 Phase 3: Brand Identity Compliance Engine tests.

import { describe, it, expect } from 'vitest';
import {
  classifyIssue,
  classifyOverallSeverity,
  initialStatusForSeverity,
} from '@/lib/brandCompliance/severity';
import type { ComplianceIssue } from '@/lib/brandCompliance/types';
import { buildValidationPrompt } from '@/lib/brandCompliance/promptBuilder';

describe('classifyIssue', () => {
  it('returns critical for cross-category palette leak', () => {
    expect(classifyIssue('cross_category_palette_leak')).toBe('critical');
  });
  it('returns critical for wordmark crossover violations', () => {
    expect(classifyIssue('viacura_wordmark_on_sproutables')).toBe('critical');
    expect(classifyIssue('sproutables_wordmark_on_viacura')).toBe('critical');
  });
  it('returns critical for SNP tagline leak + dose mismatch', () => {
    expect(classifyIssue('snp_tagline_on_non_snp')).toBe('critical');
    expect(classifyIssue('capacity_or_dose_mismatch')).toBe('critical');
  });
  it('returns major for wrong wordmark + missing DD mark + missing TM', () => {
    expect(classifyIssue('wrong_wordmark')).toBe('major');
    expect(classifyIssue('missing_identity_mark')).toBe('major');
    expect(classifyIssue('missing_tm_symbol')).toBe('major');
  });
  it('returns major for prohibited DNA helix and emoji', () => {
    expect(classifyIssue('prohibited_dna_helix')).toBe('major');
    expect(classifyIssue('prohibited_emoji')).toBe('major');
  });
  it('returns minor for certification badge miss', () => {
    expect(classifyIssue('missing_certification_badge')).toBe('minor');
  });
  it('returns minor for copy-voice unsubstantiated claim flag', () => {
    expect(classifyIssue('unsubstantiated_claim')).toBe('minor');
  });
});

describe('classifyOverallSeverity', () => {
  const issue = (code: ComplianceIssue['code'], severity: ComplianceIssue['severity']): ComplianceIssue =>
    ({ code, severity, message: '' });

  it('returns clean when issues list is empty', () => {
    expect(classifyOverallSeverity([])).toBe('clean');
  });
  it('returns minor when only minor issues present', () => {
    expect(classifyOverallSeverity([issue('missing_certification_badge', 'minor')])).toBe('minor');
  });
  it('returns major when any major issue present', () => {
    expect(classifyOverallSeverity([
      issue('missing_certification_badge', 'minor'),
      issue('wrong_wordmark', 'major'),
    ])).toBe('major');
  });
  it('returns critical when any critical issue present', () => {
    expect(classifyOverallSeverity([
      issue('wrong_wordmark', 'major'),
      issue('cross_category_palette_leak', 'critical'),
    ])).toBe('critical');
  });
});

describe('initialStatusForSeverity', () => {
  it('approves clean automatically', () => {
    expect(initialStatusForSeverity('clean')).toBe('approved');
  });
  it('rejects critical automatically', () => {
    expect(initialStatusForSeverity('critical')).toBe('rejected');
  });
  it('sends minor + major to pending_human_review', () => {
    expect(initialStatusForSeverity('minor')).toBe('pending_human_review');
    expect(initialStatusForSeverity('major')).toBe('pending_human_review');
  });
});

describe('buildValidationPrompt', () => {
  const baseProduct = {
    id: 'p-1', name: 'Creatine HCL+',
    serving_count: 60, serving_unit: 'scoops',
    dose_per_serving_text: '5 g / serving',
    sku_bottle_color_primary_hex: '#C0C0C0',
    sku_typography_primary_hex: '#B75E18',
  };

  it('requires Methylated badge for Base Formulas proof', () => {
    const prompt = buildValidationPrompt({
      product: baseProduct,
      brand: { brand_slug: 'viacura', display_name: 'ViaCura', wordmark_style: 'bi_tonal_via_cura', master_tagline: 'Built For Your Biology' },
      category: {
        category_slug: 'base_formulas', display_name: 'Base Formulas',
        identity_mark_type: 'methylated_formula', palette_rule: 'single_palette_category_wide',
        bottle_color_primary_hex: '#C0C0C0', typography_primary_hex: '#B75E18', accent_color_hex: '#1F5F3F',
        dual_delivery_mark_primary_hex: null, dual_delivery_mark_outline_hex: null,
        tagline_primary: 'Built For Your Biology',
      },
      assigned_certification_slugs: ['gmp'],
    });
    expect(prompt).toMatch(/Methylated Formula badge/);
    expect(prompt).toMatch(/MUST be present/);
    expect(prompt).toMatch(/MUST NOT be present/);
  });

  it('requires Dual Delivery mark for Advanced Formulas proof', () => {
    const prompt = buildValidationPrompt({
      product: baseProduct,
      brand: { brand_slug: 'viacura', display_name: 'ViaCura', wordmark_style: 'bi_tonal_via_cura', master_tagline: 'Built For Your Biology' },
      category: {
        category_slug: 'advanced_formulas', display_name: 'Advanced Formulas',
        identity_mark_type: 'dual_delivery_technology', palette_rule: 'per_sku_palette',
        bottle_color_primary_hex: null, typography_primary_hex: null, accent_color_hex: null,
        dual_delivery_mark_primary_hex: null, dual_delivery_mark_outline_hex: null,
        tagline_primary: 'Built For Your Biology',
      },
      assigned_certification_slugs: [],
    });
    expect(prompt).toMatch(/Dual Delivery Technology/);
    expect(prompt).toMatch(/™ symbol/);
  });

  it('forbids VIACURA wordmark on Sproutables proof', () => {
    const prompt = buildValidationPrompt({
      product: { ...baseProduct, name: 'Sproutables Children\'s+' },
      brand: { brand_slug: 'sproutables', display_name: 'Sproutables', wordmark_style: 'sproutables_leaf_figure', master_tagline: 'Peak Growth and Wellness' },
      category: {
        category_slug: 'childrens_methylated', display_name: 'Children\'s Methylated Formulas',
        identity_mark_type: 'methylated_formula', palette_rule: 'single_palette_category_wide',
        bottle_color_primary_hex: '#C0C0C0', typography_primary_hex: '#1F5F3F', accent_color_hex: '#6ABF4B',
        dual_delivery_mark_primary_hex: null, dual_delivery_mark_outline_hex: null,
        tagline_primary: 'Peak Growth and Wellness',
      },
      assigned_certification_slugs: [],
    });
    expect(prompt).toMatch(/MUST NOT render the VIACURA wordmark/);
    expect(prompt).toMatch(/Peak Growth and Wellness/);
  });

  it('prescribes SNP tagline for SNP Support proof', () => {
    const prompt = buildValidationPrompt({
      product: { ...baseProduct, name: 'MTHFR Support+' },
      brand: { brand_slug: 'viacura-snp', display_name: 'ViaCura SNP Line', wordmark_style: 'monochrome_via_cura', master_tagline: 'Your Genetics | Your Protocol' },
      category: {
        category_slug: 'snp_support', display_name: 'SNP Support Formulations',
        identity_mark_type: 'dual_delivery_technology', palette_rule: 'single_palette_category_wide',
        bottle_color_primary_hex: '#1A1A1A', typography_primary_hex: '#D4A020', accent_color_hex: '#D4A020',
        dual_delivery_mark_primary_hex: '#D4A020', dual_delivery_mark_outline_hex: '#D4A020',
        tagline_primary: 'Your Genetics | Your Protocol',
      },
      assigned_certification_slugs: [],
    });
    expect(prompt).toMatch(/Your Genetics \| Your Protocol/);
    expect(prompt).toMatch(/SNP Line uses monochrome/);
  });

  it('describes GeneX360 Testing as having no identity mark', () => {
    const prompt = buildValidationPrompt({
      product: { ...baseProduct, name: 'GeneX360 GENEX-M' },
      brand: { brand_slug: 'viacura', display_name: 'ViaCura', wordmark_style: 'bi_tonal_via_cura', master_tagline: 'Built For Your Biology' },
      category: {
        category_slug: 'genex360_testing', display_name: 'GeneX360 Testing',
        identity_mark_type: 'none', palette_rule: 'not_applicable',
        bottle_color_primary_hex: null, typography_primary_hex: null, accent_color_hex: null,
        dual_delivery_mark_primary_hex: null, dual_delivery_mark_outline_hex: null,
        tagline_primary: 'Precision wellness, written in you',
      },
      assigned_certification_slugs: [],
    });
    expect(prompt).toMatch(/test kit/);
    expect(prompt).toMatch(/Neither Methylated Formula badge NOR Dual Delivery/);
  });
});
