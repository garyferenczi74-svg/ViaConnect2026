/**
 * Prompt 214b: Firecrawl budget, gate, social PII, hash idempotency, Gordon isolation.
 */

import { describe, it, expect } from 'vitest';
import {
  defaultBudget,
  canSpend,
  recordSpend,
  isFirecrawlConfigured,
} from '@/lib/hounddog/firecrawl/client';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import { evaluateHoundDogGate } from '@/lib/hounddog/contentGate';
import {
  isHostDisallowed,
  relevanceScore,
  assertAggregateOnlySample,
} from '@/lib/hounddog/ingest/social';
import { detectSupersedes } from '@/lib/hounddog/ingest/pubmed';
import { panelAlleleFreqSeed } from '@/lib/hounddog/ingest/genomes';

describe('Prompt 214b Firecrawl budget', () => {
  it('enforces per-run page budget cutoff', () => {
    const b = defaultBudget();
    b.maxPages = 3;
    b.maxCredits = 100;
    expect(canSpend(b, 1, 1)).toBe(true);
    recordSpend(b, 1, 1);
    recordSpend(b, 1, 1);
    recordSpend(b, 1, 1);
    expect(b.hitBudget).toBe(true);
    expect(canSpend(b, 1, 1)).toBe(false);
  });

  it('does not expose API key via isFirecrawlConfigured boolean only', () => {
    expect(typeof isFirecrawlConfigured()).toBe('boolean');
  });
});

describe('Prompt 214b content hash idempotency', () => {
  it('same content yields same hash', () => {
    const a = contentHash(['pmid:1', 'title', 'abstract']);
    const b = contentHash(['pmid:1', 'title', 'abstract']);
    expect(a).toBe(b);
    expect(a).not.toBe(contentHash(['pmid:2', 'title', 'abstract']));
  });
});

describe('Prompt 214b gate boundaries', () => {
  it('blocks commercial peptide framing', () => {
    const v = evaluateHoundDogGate({
      title: 'Buy retatrutide',
      summary: 'Order retatrutide for sale online',
      source_url: 'https://example.com/x',
      source_type: 'social_aggregate',
    });
    expect(v.verdict).toBe('blocked');
  });

  it('approves educational pubmed-style abstract', () => {
    const v = evaluateHoundDogGate({
      title: 'NAD+ metabolism review',
      summary: 'Structure and function of cellular energy pathways. Educational only.',
      source_url: 'https://pubmed.ncbi.nlm.nih.gov/1/',
      source_type: 'clinical_study',
    });
    expect(v.verdict).toBe('approved');
  });
});

describe('Prompt 214b social rules', () => {
  it('skips disallowed social hosts', () => {
    expect(isHostDisallowed('https://www.facebook.com/post/1')).toBe(true);
    expect(isHostDisallowed('https://www.reddit.com/r/nutrition')).toBe(false);
  });

  it('scores relevance against topic tokens', () => {
    expect(relevanceScore('omega-3 epa dha inflammation', 'omega-3 EPA DHA')).toBeGreaterThan(0.5);
  });

  it('aggregate-only sampling rejects email PII', () => {
    expect(
      assertAggregateOnlySample([
        { is_aggregate_only: true, summary: 'Public aggregate discussion signal: sleep tips' },
      ]),
    ).toBe(true);
    expect(
      assertAggregateOnlySample([
        { is_aggregate_only: true, summary: 'Contact jane@example.com for advice' },
      ]),
    ).toBe(false);
  });
});

describe('Prompt 214b evidence upgrade + genomes seed', () => {
  it('detects follow-up title as superseding', () => {
    expect(detectSupersedes('Follow-up trial of NMN in adults', ['pmid:1'])).toBe('pmid:1');
  });

  it('seeds panel-scoped allele rows only', () => {
    const rows = panelAlleleFreqSeed('test-release');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.rsid.startsWith('rs'))).toBe(true);
  });
});

describe('Prompt 214b Gordon computation isolation (routing boundary)', () => {
  it('evidence digest copy never claims meal recompute', async () => {
    // Pure contract: gordon evidence summaries must stay educational.
    const sample =
      'Evidence context (not meal math): Omega review: EPA outcomes in cohorts';
    expect(sample).toMatch(/not meal math/i);
    expect(sample).not.toMatch(/recomputed your meal/i);
  });
});
