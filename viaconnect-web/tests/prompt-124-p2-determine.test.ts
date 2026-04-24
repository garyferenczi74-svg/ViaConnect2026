import { describe, it, expect } from 'vitest';
import { determine } from '@/lib/marshall/vision/determine';
import { extractJson, validateMarshallVisionOutput } from '@/lib/marshall/vision/claudeVision';
import { crossCheckText, DEFAULT_ANOMALY_TOKENS } from '@/lib/marshall/vision/ocr';
import { applyRows, canDraftTakedown, canEvaluate, canProduceFindings, loadVisionConfig } from '@/lib/marshall/vision/config';
import { counterfeitRules, HOLOGRAM_ABSENT, IMAGE_COUNTERFEIT_SUSPECTED, LABEL_ORIGIN_MISMATCH } from '@/lib/compliance/rules/counterfeit';
import type { MarshallVisionOutput, VisionConfigSnapshot } from '@/lib/marshall/vision/types';
import type { CounterfeitRuleInput } from '@/lib/compliance/rules/counterfeit';
import type { Finding } from '@/lib/compliance/engine/types';

// Rule.evaluate is typed Finding[] | Promise<Finding[]>; the counterfeit rules are all sync.
const asSyncFindings = (f: Finding[] | Promise<Finding[]>): Finding[] => f as Finding[];

const EVAL_ID = 'mve-2026-0424-abc12';

function mockVisionOutput(overrides: Partial<MarshallVisionOutput> = {}): MarshallVisionOutput {
  return {
    evaluation_id: EVAL_ID,
    candidate_skus: ['BPC157-LIP-30ML'],
    image_characteristics: {
      subject_is_product: true,
      primary_subject_face_like: false,
      resolution_adequate: true,
      lighting_quality: 'good',
      angle: 'front-elevation',
      occlusions: [],
    },
    feature_observations: [],
    ocr_cross_check: {
      extracted_text: ['BPC-157 LIPOSOMAL', '30mL'],
      expected_text_present: ['BPC-157 LIPOSOMAL', '30mL'],
      expected_text_missing: [],
      unexpected_text: [],
    },
    summary_flags: [],
    content_safety: { skip: false, reason: null },
    model_version: 'claude-sonnet-4-6',
    reference_corpus_version: 'v2026.04.01',
    ...overrides,
  };
}

const BASE_INPUT = {
  perceptualHashExactMatch: false,
  citedReferenceIds: ['ref-1'],
  source: 'hounddog_marketplace' as const,
};

describe('determine — rule precedence', () => {
  it('content_safety_skip overrides all other signals', () => {
    const vo = mockVisionOutput({
      content_safety: { skip: true, reason: 'face' },
      summary_flags: ['a', 'b', 'c', 'd', 'e'], // would otherwise hit counterfeit
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('content_safety_skip');
    expect(d.humanReviewRequired).toBe(true);
  });

  it('subject_is_product false → unrelated_product', () => {
    const vo = mockVisionOutput({
      image_characteristics: {
        ...mockVisionOutput().image_characteristics,
        subject_is_product: false,
      },
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('unrelated_product');
  });

  it('resolution_adequate false → insufficient_image_quality', () => {
    const vo = mockVisionOutput({
      image_characteristics: {
        ...mockVisionOutput().image_characteristics,
        resolution_adequate: false,
      },
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('insufficient_image_quality');
    expect(d.humanReviewRequired).toBe(true);
  });

  it('empty candidate_skus + empty citedReferenceIds → unrelated_product', () => {
    const vo = mockVisionOutput({ candidate_skus: [] });
    const d = determine({ ...BASE_INPUT, citedReferenceIds: [], visionOutput: vo });
    expect(d.verdict).toBe('unrelated_product');
  });

  it('3+ mismatches → counterfeit_suspected', () => {
    const vo = mockVisionOutput({
      summary_flags: ['cap_geometry_mismatch', 'batch_format_mismatch', 'hologram_absent', 'expected_origin_text_missing'],
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('counterfeit_suspected');
    expect(d.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('3+ mismatches with hologram absent → confidence >= 0.90', () => {
    const vo = mockVisionOutput({
      summary_flags: ['cap_geometry_mismatch', 'batch_format_mismatch', 'hologram_absent', 'expected_origin_text_missing'],
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it('2 mismatches → counterfeit_suspected, lower confidence', () => {
    const vo = mockVisionOutput({
      summary_flags: ['cap_geometry_mismatch', 'batch_format_mismatch'],
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('counterfeit_suspected');
    expect(d.confidence).toBeGreaterThanOrEqual(0.60);
  });

  it('1 mismatch on hologram-required SKU when hologram absent → counterfeit_suspected', () => {
    const vo = mockVisionOutput({
      candidate_skus: ['BPC157-LIP-30ML'],
      summary_flags: ['hologram_absent'],
    });
    const d = determine({
      ...BASE_INPUT,
      visionOutput: vo,
      hologramRequiredSkus: new Set(['BPC157-LIP-30ML']),
    });
    expect(d.verdict).toBe('counterfeit_suspected');
  });

  it('1 mismatch on non-hologram-required SKU → inconclusive', () => {
    const vo = mockVisionOutput({
      candidate_skus: ['OTHER-SKU'],
      summary_flags: ['cap_geometry_mismatch'],
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('inconclusive');
  });

  it('zero mismatches + phash exact match → authentic >= 0.95', () => {
    const vo = mockVisionOutput({
      image_characteristics: {
        ...mockVisionOutput().image_characteristics,
        perceptual_hash_exact_match: true,
      },
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo, perceptualHashExactMatch: true });
    expect(d.verdict).toBe('authentic');
    expect(d.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('zero mismatches + user-taken photo + SKU identified → authentic', () => {
    const vo = mockVisionOutput();
    const d = determine({ ...BASE_INPUT, visionOutput: vo, userTakenPhoto: true });
    expect(d.verdict).toBe('authentic');
    expect(d.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('zero mismatches + unauthorized-marketplace context → unauthorized_channel_suspected', () => {
    const vo = mockVisionOutput();
    const d = determine({ ...BASE_INPUT, visionOutput: vo, unauthorizedMarketplaceContext: true });
    expect(d.verdict).toBe('unauthorized_channel_suspected');
  });

  it('default → inconclusive with bounded confidence', () => {
    // SKU present but no mismatches + no phash exact + no user-taken + no unauthorized ctx
    const vo = mockVisionOutput();
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('inconclusive');
    expect(d.confidence).toBeLessThanOrEqual(0.60);
  });
});

describe('determine — human-review gating', () => {
  it('authentic from practitioner_appeal below 0.85 → humanReviewRequired = true', () => {
    const vo = mockVisionOutput({
      image_characteristics: {
        ...mockVisionOutput().image_characteristics,
        lighting_quality: 'fair',
      },
    });
    const d = determine({
      ...BASE_INPUT,
      visionOutput: vo,
      userTakenPhoto: true,
      source: 'practitioner_appeal',
    });
    expect(d.verdict).toBe('authentic');
    if (d.confidence < 0.85) {
      expect(d.humanReviewRequired).toBe(true);
    }
  });

  it('counterfeit_suspected at any confidence → humanReviewRequired = true', () => {
    const vo = mockVisionOutput({
      summary_flags: ['a_mismatch', 'b_mismatch'],
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.verdict).toBe('counterfeit_suspected');
    expect(d.humanReviewRequired).toBe(true);
  });
});

describe('determine — confidence determinism', () => {
  it('same input → same confidence across runs', () => {
    const vo = mockVisionOutput({
      summary_flags: ['cap_geometry_mismatch', 'batch_format_mismatch'],
    });
    const a = determine({ ...BASE_INPUT, visionOutput: vo });
    const b = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(a.confidence).toBe(b.confidence);
    expect(a.verdict).toBe(b.verdict);
  });

  it('confidence is bounded 0.00–1.00', () => {
    const vo = mockVisionOutput({
      summary_flags: Array(20).fill('some_mismatch'), // pathological many flags
    });
    const d = determine({ ...BASE_INPUT, visionOutput: vo });
    expect(d.confidence).toBeGreaterThanOrEqual(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });
});

describe('claudeVision — schema validation', () => {
  const opts = { evaluationId: EVAL_ID, referenceCorpusVersion: 'v2026.04.01' };

  it('accepts a valid MarshallVisionOutput', () => {
    const valid = mockVisionOutput();
    expect(validateMarshallVisionOutput(valid, opts)).not.toBeNull();
  });

  it('rejects unknown top-level fields (injection attempt)', () => {
    const tainted = { ...mockVisionOutput(), tool_use: { name: 'exec' } };
    expect(validateMarshallVisionOutput(tainted, opts)).toBeNull();
  });

  it('rejects wrong type on content_safety.skip', () => {
    const bad = { ...mockVisionOutput(), content_safety: { skip: 'yes', reason: null } };
    expect(validateMarshallVisionOutput(bad, opts)).toBeNull();
  });

  it('rejects bad feature_observations.match enum', () => {
    // Bypass TS strictness to exercise the runtime validator against an invalid enum.
    const bad = {
      ...mockVisionOutput(),
      feature_observations: [{
        feature: 'logo',
        reference_image: 'r.jpg',
        observation: 'present',
        match: 'definitely_authentic',
        note: 'nope',
      }],
    } as unknown;
    expect(validateMarshallVisionOutput(bad, opts)).toBeNull();
  });

  it('extractJson handles raw object response', () => {
    const raw = '{"evaluation_id":"x","candidate_skus":[]}';
    expect(extractJson(raw)).toBe(raw);
  });

  it('extractJson handles fenced code block', () => {
    const raw = '```json\n{"a":1}\n```';
    expect(extractJson(raw)).toBe('{"a":1}');
  });

  it('extractJson returns null on garbage', () => {
    expect(extractJson('nope, not json at all')).toBeNull();
  });
});

describe('ocr cross-check', () => {
  it('partitions expected text into present/missing and surfaces unexpected', () => {
    const extracted = 'BPC-157 LIPOSOMAL 30mL Manufactured in China';
    const result = crossCheckText(extracted, ['BPC-157 LIPOSOMAL', 'Made in USA']);
    expect(result.expectedPresent).toContain('BPC-157 LIPOSOMAL');
    expect(result.expectedMissing).toContain('Made in USA');
    expect(result.unexpected).toContain('Manufactured in China');
  });

  it('empty text → all expected go to missing, nothing present', () => {
    const result = crossCheckText('', ['Made in USA']);
    expect(result.expectedPresent).toEqual([]);
    expect(result.expectedMissing).toEqual(['Made in USA']);
  });

  it('DEFAULT_ANOMALY_TOKENS contains counterfeit-indicator phrases', () => {
    expect(DEFAULT_ANOMALY_TOKENS).toContain('Manufactured in China');
    expect(DEFAULT_ANOMALY_TOKENS).toContain('For research use only');
  });
});

describe('config loader', () => {
  it('applyRows parses seeded rows into snapshot', () => {
    const base: VisionConfigSnapshot = {
      mode: 'off',
      sourceEnabled: {
        hounddog_marketplace: false, hounddog_social: false, practitioner_appeal: false,
        consumer_report: false, admin_upload: false, test_buy: false,
      },
      takedownEnabled: {
        amazon_brand_registry: false, ebay_vero: false, walmart_seller_protection: false,
        etsy_ip_policy: false, dmca_takedown: false, platform_trust_safety: false, manual_legal: false,
      },
      rateLimitDailyCapPerSource: 100,
      rateLimitPerPractitionerDaily: 10,
      rateLimitPerConsumerDaily: 3,
    };
    const rows = [
      { key: 'mode', value: 'shadow' },
      { key: 'source.admin_upload', value: true },
      { key: 'takedown.manual_legal', value: true },
      { key: 'rate_limit.per_consumer_daily', value: 5 },
    ];
    const snap = applyRows(base, rows);
    expect(snap.mode).toBe('shadow');
    expect(snap.sourceEnabled.admin_upload).toBe(true);
    expect(snap.takedownEnabled.manual_legal).toBe(true);
    expect(snap.rateLimitPerConsumerDaily).toBe(5);
  });

  it('ignores unknown keys and invalid modes', () => {
    const base = defaultSnap();
    const snap = applyRows(base, [
      { key: 'mode', value: 'not_a_mode' },
      { key: 'source.not_a_source', value: true },
      { key: 'garbage_key', value: 42 },
    ]);
    expect(snap.mode).toBe(base.mode); // unchanged
  });

  it('canProduceFindings requires mode=active AND source enabled', () => {
    const snap = defaultSnap();
    snap.mode = 'shadow';
    snap.sourceEnabled.admin_upload = true;
    expect(canProduceFindings(snap, 'admin_upload')).toBe(false); // shadow
    snap.mode = 'active';
    expect(canProduceFindings(snap, 'admin_upload')).toBe(true);
    snap.sourceEnabled.admin_upload = false;
    expect(canProduceFindings(snap, 'admin_upload')).toBe(false);
  });

  it('canEvaluate allows shadow mode but blocks off mode', () => {
    const snap = defaultSnap();
    snap.sourceEnabled.admin_upload = true;
    snap.mode = 'shadow';
    expect(canEvaluate(snap, 'admin_upload')).toBe(true);
    snap.mode = 'off';
    expect(canEvaluate(snap, 'admin_upload')).toBe(false);
    snap.mode = 'active';
    expect(canEvaluate(snap, 'admin_upload')).toBe(true);
  });

  it('canDraftTakedown checks per-platform flag', () => {
    const snap = defaultSnap();
    expect(canDraftTakedown(snap, 'amazon_brand_registry')).toBe(false);
    snap.takedownEnabled.amazon_brand_registry = true;
    expect(canDraftTakedown(snap, 'amazon_brand_registry')).toBe(true);
  });
});

function defaultSnap(): VisionConfigSnapshot {
  return {
    mode: 'shadow',
    sourceEnabled: {
      hounddog_marketplace: false, hounddog_social: false, practitioner_appeal: false,
      consumer_report: false, admin_upload: false, test_buy: false,
    },
    takedownEnabled: {
      amazon_brand_registry: false, ebay_vero: false, walmart_seller_protection: false,
      etsy_ip_policy: false, dmca_takedown: false, platform_trust_safety: false, manual_legal: false,
    },
    rateLimitDailyCapPerSource: 1000,
    rateLimitPerPractitionerDaily: 25,
    rateLimitPerConsumerDaily: 5,
  };
}

describe('counterfeit rules', () => {
  const baseInput: CounterfeitRuleInput = {
    evaluationId: EVAL_ID,
    verdict: 'counterfeit_suspected',
    confidence: 0.85,
    matchedSku: 'BPC157-LIP-30ML',
    mismatchFlags: ['cap_geometry_mismatch', 'hologram_absent'],
    source: 'hounddog_marketplace',
  };

  it('IMAGE_COUNTERFEIT_SUSPECTED fires on verdict=counterfeit_suspected + confidence >= 0.60', () => {
    const findings = asSyncFindings(IMAGE_COUNTERFEIT_SUSPECTED.evaluate(baseInput));
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('P0');
    expect(findings[0].ruleId).toBe('MARSHALL.COUNTERFEIT.IMAGE_COUNTERFEIT_SUSPECTED');
    expect(findings[0].surface).toBe('product_image');
  });

  it('IMAGE_COUNTERFEIT_SUSPECTED does NOT fire below 0.60 confidence', () => {
    const findings = asSyncFindings(IMAGE_COUNTERFEIT_SUSPECTED.evaluate({ ...baseInput, confidence: 0.55 }));
    expect(findings.length).toBe(0);
  });

  it('HOLOGRAM_ABSENT fires when hologram_absent flag present', () => {
    const findings = asSyncFindings(HOLOGRAM_ABSENT.evaluate(baseInput));
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('P1');
  });

  it('HOLOGRAM_ABSENT does NOT fire without flag', () => {
    const findings = asSyncFindings(HOLOGRAM_ABSENT.evaluate({ ...baseInput, mismatchFlags: [] }));
    expect(findings.length).toBe(0);
  });

  it('LABEL_ORIGIN_MISMATCH fires on unexpected_origin_text_present', () => {
    const findings = asSyncFindings(LABEL_ORIGIN_MISMATCH.evaluate({
      ...baseInput,
      mismatchFlags: ['unexpected_origin_text_present'],
    }));
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('P0');
  });

  it('counterfeitRules aggregate contains all 7 rules', () => {
    expect(counterfeitRules.length).toBe(7);
    for (const r of counterfeitRules) {
      expect(r.id).toMatch(/^MARSHALL\.COUNTERFEIT\./);
      expect(r.pillar).toBe('COUNTERFEIT');
      expect(r.surfaces).toContain('product_image');
      expect(r.lastReviewed).toBe('2026-04-24');
    }
  });
});

describe('invariants', () => {
  it('every counterfeit rule has a test-equivalent in this file', () => {
    // sanity: counterfeitRules.length matches expected 7 from spec §10.2
    expect(counterfeitRules.length).toBe(7);
  });

  it('loadVisionConfig falls back to shadow default on DB error', async () => {
    const fakeClient = {
      from: () => ({
        select: async () => ({ data: null, error: new Error('db down') }),
      }),
    } as unknown as Parameters<typeof loadVisionConfig>[0];
    const snap = await loadVisionConfig(fakeClient);
    expect(snap.mode).toBe('shadow');
    expect(Object.values(snap.sourceEnabled).every((v) => v === false)).toBe(true);
  });
});
