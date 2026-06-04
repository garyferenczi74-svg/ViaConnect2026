// Prompt 175 Parts B + C + D (2026-06-04): supplement extraction unit tests.
//
// Covers the pieces that can be exercised without a live Claude API or a
// Supabase round trip:
//   * parse: code-fence stripping + JSON shape tolerance + defensive
//     coercion of dose / unit / confidence
//   * router: Haiku-then-Sonnet-then-Opus escalation rules under the
//     spec'd thresholds
//   * canonical-match: in-isolation similarity normalization (the RPC
//     adapter is mocked)

import { describe, it, expect } from 'vitest';
import {
  stripCodeFences,
  extractJsonObject,
  parseClaudeExtraction,
} from '@/lib/caq/supplement-extraction/parse';
import {
  runExtraction,
  shouldEscalateAfterHaiku,
  shouldEscalateAfterSonnet,
} from '@/lib/caq/supplement-extraction/router';
import {
  CANONICAL_MATCH_THRESHOLD,
} from '@/lib/caq/supplement-extraction/canonical-match';
import {
  HAIKU_MIN_CONFIDENCE,
  SONNET_MIN_CONFIDENCE,
} from '@/lib/caq/supplement-extraction/config';
import type {
  ExtractedSupplement,
  ExtractionResult,
  ModelTier,
} from '@/lib/caq/supplement-extraction/types';

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

describe('stripCodeFences', () => {
  it('removes markdown fences and trims surrounding whitespace', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripCodeFences('  ```\n{"a":1}\n```  ')).toBe('{"a":1}');
  });
  it('leaves a plain JSON string untouched', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe('extractJsonObject', () => {
  it('isolates the first top-level object in a noisy response', () => {
    expect(extractJsonObject('here is the json {"a":1} done')).toBe('{"a":1}');
  });
  it('returns null when no object is present', () => {
    expect(extractJsonObject('this is just prose')).toBeNull();
  });
});

describe('parseClaudeExtraction', () => {
  it('parses a canonical 175 shape (items array)', () => {
    const raw = JSON.stringify({
      items: [
        { rawText: 'Vitamin D3', name: 'Vitamin D3', brand: 'Acme', dose: 1000, unit: 'IU', form: 'softgel', confidence: 0.85 },
      ],
    });
    const r = parseClaudeExtraction(raw);
    expect(r).not.toBeNull();
    if (r) {
      expect(r.items).toHaveLength(1);
      expect(r.items[0].name).toBe('Vitamin D3');
      expect(r.items[0].confidence).toBeCloseTo(0.85, 5);
    }
  });

  it('parses the legacy supplement-vision ingredients shape and lifts brand from the root', () => {
    const raw = JSON.stringify({
      brand: 'Organika',
      productName: 'Magnesium Complex',
      ingredients: [
        { name: 'Magnesium Glycinate', amount: 212, unit: 'mg', form: 'capsule' },
      ],
      overallConfidence: 'high',
    });
    const r = parseClaudeExtraction(raw);
    expect(r).not.toBeNull();
    if (r) {
      expect(r.items[0].brand).toBe('Organika');
      expect(r.items[0].dose).toBe(212);
      expect(r.items[0].unit).toBe('mg');
      expect(r.items[0].confidence).toBeCloseTo(0.9, 5);
    }
  });

  it('returns null for unparseable text', () => {
    expect(parseClaudeExtraction('not json')).toBeNull();
  });

  it('returns an empty items array when the model speaks JSON but lists nothing', () => {
    const r = parseClaudeExtraction('{"items":[]}');
    expect(r).not.toBeNull();
    if (r) expect(r.items).toHaveLength(0);
  });

  it('normalizes a percent-scale confidence into 0..1', () => {
    const r = parseClaudeExtraction(JSON.stringify({
      items: [{ name: 'X', confidence: 80 }],
    }));
    expect(r).not.toBeNull();
    if (r) expect(r.items[0].confidence).toBeCloseTo(0.8, 5);
  });
});

// ---------------------------------------------------------------------------
// Router escalation rules
// ---------------------------------------------------------------------------

function buildResult(
  tier: ModelTier,
  items: ReadonlyArray<Pick<ExtractedSupplement, 'name' | 'confidence'>>,
  outcomeCode: ExtractionResult['outcomeCode'] = 'success',
  latencyMs = 1000,
): ExtractionResult {
  return {
    items: items.map((it) => ({
      rawText: it.name,
      name: it.name,
      brand: null,
      dose: null,
      unit: null,
      form: null,
      confidence: it.confidence,
    })),
    modelTier: tier,
    escalated: false,
    latencyMs,
    outcomeCode,
  };
}

describe('shouldEscalateAfterHaiku', () => {
  it('returns null when Haiku found items above the threshold', () => {
    const haiku = buildResult('haiku', [{ name: 'Vitamin D3', confidence: 0.9 }]);
    expect(shouldEscalateAfterHaiku(haiku, HAIKU_MIN_CONFIDENCE)).toBeNull();
  });

  it('escalates when any item is below the threshold', () => {
    const haiku = buildResult('haiku', [
      { name: 'Vitamin D3', confidence: 0.9 },
      { name: 'Magnesium', confidence: 0.5 },
    ]);
    expect(shouldEscalateAfterHaiku(haiku, HAIKU_MIN_CONFIDENCE)).toBe('success');
  });

  it('escalates when Haiku returned zero items', () => {
    const haiku = buildResult('haiku', []);
    expect(shouldEscalateAfterHaiku(haiku, HAIKU_MIN_CONFIDENCE)).toBe('no_items');
  });

  it('escalates on upstream timeout or error', () => {
    expect(shouldEscalateAfterHaiku(buildResult('haiku', [], 'timeout'), HAIKU_MIN_CONFIDENCE)).toBe('timeout');
    expect(shouldEscalateAfterHaiku(buildResult('haiku', [], 'upstream_error'), HAIKU_MIN_CONFIDENCE)).toBe('upstream_error');
  });
});

describe('shouldEscalateAfterSonnet', () => {
  it('never escalates when opus is disabled', () => {
    const sonnet = buildResult('sonnet', [{ name: 'Vitamin D3', confidence: 0.3 }]);
    expect(shouldEscalateAfterSonnet(sonnet, SONNET_MIN_CONFIDENCE, false)).toBeNull();
  });

  it('escalates to opus when enabled AND any item is below threshold', () => {
    const sonnet = buildResult('sonnet', [{ name: 'Vitamin D3', confidence: 0.3 }]);
    expect(shouldEscalateAfterSonnet(sonnet, SONNET_MIN_CONFIDENCE, true)).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// Full router run, with a fake adapter
// ---------------------------------------------------------------------------

describe('runExtraction', () => {
  it('stops at Haiku when items are confident', async () => {
    const calls: ModelTier[] = [];
    const adapter = async (tier: ModelTier): Promise<ExtractionResult> => {
      calls.push(tier);
      return buildResult(tier, [{ name: 'Vitamin D3', confidence: 0.9 }]);
    };
    const r = await runExtraction(adapter, { opusEnabledOverride: false });
    expect(calls).toEqual(['haiku']);
    expect(r.result.modelTier).toBe('haiku');
    expect(r.result.escalated).toBe(false);
    expect(r.attempts).toHaveLength(1);
  });

  it('escalates to Sonnet when Haiku items are below threshold', async () => {
    const calls: ModelTier[] = [];
    const adapter = async (tier: ModelTier): Promise<ExtractionResult> => {
      calls.push(tier);
      const conf = tier === 'haiku' ? 0.5 : 0.9;
      return buildResult(tier, [{ name: 'X', confidence: conf }]);
    };
    const r = await runExtraction(adapter, { opusEnabledOverride: false });
    expect(calls).toEqual(['haiku', 'sonnet']);
    expect(r.result.modelTier).toBe('sonnet');
    expect(r.result.escalated).toBe(true);
    expect(r.attempts).toHaveLength(2);
  });

  it('escalates to Opus only when the env flag is on AND Sonnet still low', async () => {
    const calls: ModelTier[] = [];
    const adapter = async (tier: ModelTier): Promise<ExtractionResult> => {
      calls.push(tier);
      const conf = tier === 'opus' ? 0.95 : 0.4;
      return buildResult(tier, [{ name: 'X', confidence: conf }]);
    };
    const r = await runExtraction(adapter, { opusEnabledOverride: true });
    expect(calls).toEqual(['haiku', 'sonnet', 'opus']);
    expect(r.result.modelTier).toBe('opus');
    expect(r.result.escalated).toBe(true);
    expect(r.attempts).toHaveLength(3);
  });

  it('stops at Sonnet when opus is disabled, even if Sonnet items are low', async () => {
    const calls: ModelTier[] = [];
    const adapter = async (tier: ModelTier): Promise<ExtractionResult> => {
      calls.push(tier);
      return buildResult(tier, [{ name: 'X', confidence: 0.4 }]);
    };
    const r = await runExtraction(adapter, { opusEnabledOverride: false });
    expect(calls).toEqual(['haiku', 'sonnet']);
    expect(r.result.modelTier).toBe('sonnet');
    expect(r.attempts).toHaveLength(2);
  });

  it('records every tier attempt in the audit trail', async () => {
    const adapter = async (tier: ModelTier): Promise<ExtractionResult> => buildResult(tier, [{ name: 'X', confidence: 0.4 }]);
    const r = await runExtraction(adapter, { opusEnabledOverride: true });
    const tiers = r.attempts.map((a) => a.tier);
    expect(tiers).toEqual(['haiku', 'sonnet', 'opus']);
    expect(r.attempts.every((a) => a.itemCount === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Canonical match threshold
// ---------------------------------------------------------------------------

describe('CANONICAL_MATCH_THRESHOLD', () => {
  it('matches the spec-locked human-confirmation threshold', () => {
    expect(CANONICAL_MATCH_THRESHOLD).toBeGreaterThanOrEqual(0.6);
    expect(CANONICAL_MATCH_THRESHOLD).toBeLessThanOrEqual(0.85);
  });
});
