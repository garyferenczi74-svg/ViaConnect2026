/**
 * Peptide scout deny-list scope (allowlist removed for Thanos/Hermes education).
 */
import { describe, it, expect } from 'vitest';
import {
  assertPeptideScoutScope,
  assertAllowlistScope,
  isHostPeptideDenied,
  PEPTIDE_CRAWL_DENY_HOSTS,
  FALLBACK_ALLOWLIST_DOMAINS,
} from '@/lib/agents/authorityAllowlist';
import {
  buildScoutQueries,
  resolvePeptideEducationTarget,
  type PeptideCatalogRow,
} from '@/lib/thanos/allowlistIngest';

describe('assertPeptideScoutScope deny-first', () => {
  it('allows non-allowlisted academic hosts', () => {
    const r = assertPeptideScoutScope('https://www.sciencedirect.com/science/article/pii/S1');
    expect(r.ok).toBe(true);
  });

  it('allows random research host that would fail allowlist', () => {
    const allow = assertAllowlistScope(
      'https://www.biorxiv.org/content/10.1101/2024.01.01.123',
      [...FALLBACK_ALLOWLIST_DOMAINS],
    );
    expect(allow.ok).toBe(false);
    const peptide = assertPeptideScoutScope(
      'https://www.biorxiv.org/content/10.1101/2024.01.01.123',
    );
    expect(peptide.ok).toBe(true);
  });

  it('denies Mercola and G56 peers', () => {
    expect(assertPeptideScoutScope('https://www.mercola.com/article').ok).toBe(false);
    expect(assertPeptideScoutScope('https://www.lifeextension.com/magazine').ok).toBe(false);
    expect(assertPeptideScoutScope('https://www.mindbodygreen.com/articles/x').ok).toBe(false);
    expect(PEPTIDE_CRAWL_DENY_HOSTS.join(' ')).toMatch(/mercola/);
  });

  it('denies ICTRP search host', () => {
    const r = assertPeptideScoutScope(
      'https://trialsearch.who.int/Trial2.aspx?TrialID=NCT1',
    );
    expect(r.ok).toBe(false);
    expect(isHostPeptideDenied('trialsearch.who.int')).toBe(true);
  });

  it('merges dynamic extra deny domains', () => {
    const r = assertPeptideScoutScope('https://spam.example.com/p', [
      'spam.example.com',
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('peptide_deny_list');
  });
});

describe('catalog scout helpers', () => {
  const catalog: PeptideCatalogRow[] = [
    { slug: 'bpc-157', display: 'BPC-157', canonical: 'BPC-157' },
    { slug: 'retatrutide', display: 'Retatrutide', canonical: 'Retatrutide' },
    { slug: 'aod-9604', display: 'AOD-9604', canonical: 'AOD-9604' },
  ];

  it('builds one query per catalog row', () => {
    const qs = buildScoutQueries(catalog);
    expect(qs.length).toBe(3);
    expect(qs.some((q) => /retatrutide/i.test(q))).toBe(true);
  });

  it('resolves peptide target from title text', () => {
    const hit = resolvePeptideEducationTarget(
      'New Retatrutide metabolic study summary',
      catalog,
    );
    expect(hit?.slug).toBe('retatrutide');
  });
});
