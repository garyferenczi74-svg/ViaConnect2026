/**
 * Prompt 213a: composition, gate block, supplier skip, idempotent keys.
 */

import { describe, it, expect } from 'vitest';
import { composeAcceleratorInsights, composePersonalizedRead } from '../compose';
import type { SupplierDigest } from '../types';
import { evaluateHoundDogGate } from '@/lib/hounddog/contentGate';
import { canInsertInsightKey, insightKeyFromHeadline } from '@/hooks/journey/useEngineAccelerators';

function digest(
  supplier: SupplierDigest['supplier'],
  items: SupplierDigest['items'],
  skipped = false,
): SupplierDigest {
  return {
    supplier,
    ok: !skipped,
    skipped,
    skipReason: skipped ? 'timeout' : undefined,
    durationMs: 1,
    items: skipped ? [] : items,
  };
}

describe('Prompt 213a composeAcceleratorInsights', () => {
  it('produces at most 4 distinct hub-diverse insights', () => {
    const digests: SupplierDigest[] = [
      digest('gordon', [
        {
          id: 'g1',
          hub: 'Nutrition',
          summary: '3 meals logged',
          metricValue: '3',
          refs: ['m1'],
        },
      ]),
      digest('arnold', [
        {
          id: 'a1',
          hub: 'Biology',
          summary: 'Body fat 18.2%',
          metricValue: '18.2',
          refs: ['c1'],
        },
      ]),
      digest('jeffery', [
        {
          id: 'j1',
          hub: 'CAQ',
          summary: 'CAQ on file',
          metricValue: 'connected',
          refs: ['caq'],
        },
      ]),
      digest('sherlock', [
        {
          id: 's1',
          hub: 'Supplements',
          summary: 'Gated NAD study approved',
          metricValue: '1',
          refs: ['study'],
        },
      ]),
    ];
    const insights = composeAcceleratorInsights(digests, 4);
    expect(insights.length).toBeLessThanOrEqual(4);
    expect(insights.length).toBeGreaterThanOrEqual(3);
    const hubs = new Set(insights.map((i) => i.sourceHub));
    expect(hubs.size).toBe(insights.length);
    for (const ins of insights) {
      expect(ins.insightKey.length).toBeGreaterThan(0);
      expect(ins.sourceRefs.length).toBeGreaterThan(0);
      expect(ins.supplierAgent.length).toBeGreaterThan(0);
    }
  });

  it('does not fabricate when suppliers are skipped', () => {
    const digests: SupplierDigest[] = [
      digest('gordon', [], true),
      digest('arnold', [], true),
      digest('jeffery', [
        {
          id: 'j-sparse',
          hub: 'CAQ',
          summary: 'CAQ not complete',
          metricValue: null,
          refs: ['caq:missing'],
        },
      ]),
    ];
    const insights = composeAcceleratorInsights(digests, 4);
    expect(insights.every((i) => !/18\.2|kcal fabricated/i.test(i.description))).toBe(true);
    expect(insights.some((i) => i.sourceHub === 'CAQ')).toBe(true);
  });

  it('personalized read uses same top accelerator material', () => {
    const digests: SupplierDigest[] = [
      digest('arnold', [
        {
          id: 'a1',
          hub: 'Biology',
          summary: 'Latest body fat 17.5%',
          metricValue: '17.5',
          refs: ['c1'],
        },
      ]),
    ];
    const insights = composeAcceleratorInsights(digests, 4);
    const read = composePersonalizedRead(digests, insights, 'Gary');
    expect(read.greeting).toContain('Gary');
    expect(read.recommendation).toContain(insights[0].title);
    expect(read.focusArea).toBe(insights[0].sourceHub);
  });
});

describe('Prompt 213a Hound Dog gate', () => {
  it('blocks disease/commercial framing', () => {
    const blocked = evaluateHoundDogGate({
      title: 'Cure cancer with this peptide',
      summary: 'Buy now retatrutide for sale',
      source_url: 'https://example.com/bad',
      source_type: 'social_aggregate',
    });
    expect(blocked.verdict).toBe('blocked');
    expect(blocked.agent).toBe('marshall');
  });

  it('approves educational structure/function study', () => {
    const ok = evaluateHoundDogGate({
      title: 'NAD+ pathway nutrition education',
      summary: 'Structure and function discussion of cellular energy. Bioavailability 10x to 28x when stated.',
      source_url: 'https://pubmed.ncbi.nlm.nih.gov/demo',
      source_type: 'clinical_study',
    });
    expect(ok.verdict).toBe('approved');
  });

  it('failing gate never promotes (verdict not approved)', () => {
    const bad = evaluateHoundDogGate({
      title: 'Semaglutide shop',
      summary: 'Add to cart',
      source_url: 'https://example.com/shop',
      source_type: 'social_aggregate',
    });
    expect(bad.verdict).not.toBe('approved');
  });
});

describe('Prompt 213a idempotent insight keys', () => {
  it('rejects second insert with same insight_key', () => {
    const key = insightKeyFromHeadline('Biology-Body composition signal in focus');
    const existing = new Set([key]);
    expect(canInsertInsightKey(existing, key)).toBe(false);
    expect(canInsertInsightKey(existing, 'nutrition-steady-rhythm')).toBe(true);
  });
});
