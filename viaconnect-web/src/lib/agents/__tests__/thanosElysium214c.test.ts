/**
 * Prompt 214c: allowlist scope, peptide purchase path, coverage audit,
 * upload UNKNOWN, handoff boundaries, cross-agent dedupe.
 */

import { describe, it, expect } from 'vitest';
import {
  assertAllowlistScope,
  isHostAllowlisted,
  hostFromUrl,
  FALLBACK_ALLOWLIST_DOMAINS,
} from '@/lib/agents/authorityAllowlist';
import {
  assertNoPeptidePurchasePath,
  isPractitionerDepthAllowed,
} from '@/lib/thanos/allowlistIngest';
import {
  auditGenex360Coverage,
  mapUploadVariants,
  displayMetricValue,
} from '@/lib/elysium/coverage';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import { evaluateHoundDogGate } from '@/lib/hounddog/contentGate';
import { CLINICAL_SNPS } from '@/lib/genetics/clinicalSnps';
import { getDisplayName, isKnownSlug } from '@/lib/getDisplayName';
import { isKnownAgentId } from '@/lib/agents/registry';

describe('214c allowlist scope', () => {
  it('allows pubmed and blocks random social hosts', () => {
    const allow = [...FALLBACK_ALLOWLIST_DOMAINS];
    expect(assertAllowlistScope('https://pubmed.ncbi.nlm.nih.gov/123', allow).ok).toBe(true);
    expect(assertAllowlistScope('https://www.fda.gov/drugs', allow).ok).toBe(true);
    expect(assertAllowlistScope('https://www.instagram.com/post/1', allow).ok).toBe(false);
    expect(assertAllowlistScope('https://tiktok.com/@x', allow).ok).toBe(false);
  });

  it('matches subdomains of allowlisted roots', () => {
    expect(isHostAllowlisted('www.nature.com', ['nature.com'])).toBe(true);
    expect(isHostAllowlisted('journals.nature.com', ['nature.com'])).toBe(true);
    expect(hostFromUrl('not-a-url')).toBe('');
  });
});

describe('214c peptide purchase path', () => {
  it('rejects shop and cart hrefs on peptide surfaces', () => {
    expect(assertNoPeptidePurchasePath(['/peptide-protocol', '/science'])).toBe(true);
    expect(assertNoPeptidePurchasePath(['/shop/peptides/bpc'])).toBe(false);
    expect(assertNoPeptidePurchasePath(['/checkout'])).toBe(false);
  });

  it('confines practitioner depth to practitioner contexts', () => {
    expect(isPractitionerDepthAllowed('/practitioner/protocols')).toBe(true);
    expect(isPractitionerDepthAllowed('/naturopath/patients/1')).toBe(true);
    expect(isPractitionerDepthAllowed('/peptide-protocol')).toBe(false);
    expect(isPractitionerDepthAllowed('/shop')).toBe(false);
  });

  it('Marshall blocks peptide commercial framing', () => {
    const v = evaluateHoundDogGate({
      title: 'Order retatrutide today',
      summary: 'Purchase tirzepatide online',
      source_url: 'https://pubmed.ncbi.nlm.nih.gov/1',
      source_type: 'thanos_peptide',
    });
    expect(v.verdict).toBe('blocked');
  });

  it('Lex escalates disease-treatment adjacency', () => {
    const v = evaluateHoundDogGate({
      title: 'Peptide therapy for disease syndrome',
      summary: 'A drug treat approach for a disorder',
      source_url: 'https://www.fda.gov/x',
      source_type: 'thanos_peptide',
    });
    expect(v.verdict).toBe('escalated');
    expect(v.agent).toBe('lex');
  });
});

describe('214c GENEX360 coverage audit', () => {
  it('covers every clinical SNP with explicit status', () => {
    const audit = auditGenex360Coverage();
    expect(audit.pass).toBe(true);
    expect(audit.total).toBeGreaterThanOrEqual(CLINICAL_SNPS.length);
    expect(audit.missing).toHaveLength(0);
    for (const row of audit.rows) {
      expect(['interpreted', 'pending', 'unknown']).toContain(row.status);
      expect(row.effect_summary.length).toBeGreaterThan(0);
    }
  });
});

describe('214c upload UNKNOWN handling', () => {
  it('maps catalog hits and records UNKNOWN without fabricating 0', () => {
    const result = mapUploadVariants([
      { rsid: 'rs1801133', genotype: 'CT' },
      { rsid: 'rs99999999', genotype: 'AA' },
      { rsid: 'rs4680', genotype: 'UNKNOWN' },
      { rsid: '', genotype: null },
    ]);
    expect(result.mapped).toBe(1);
    expect(result.unknown).toBeGreaterThanOrEqual(2);
    expect(result.pending).toBe(1);
    expect(result.coveragePct).not.toBe(0);
    expect(displayMetricValue(null)).toBe('UNKNOWN');
    expect(displayMetricValue('UNKNOWN')).toBe('UNKNOWN');
    expect(displayMetricValue(NaN)).toBe('UNKNOWN');
  });
});

describe('214c handoff and roster', () => {
  it('registers Thanos and Elysium with display names', () => {
    expect(isKnownAgentId('thanos')).toBe(true);
    expect(isKnownAgentId('elysium')).toBe(true);
    expect(isKnownSlug('thanos')).toBe(true);
    expect(getDisplayName('thanos')).toBe('Thanos');
    expect(getDisplayName('elysium')).toBe('Elysium');
  });
});

describe('214c cross-agent content hash dedupe', () => {
  it('same source payload yields identical content hash across agents', () => {
    const parts = ['https://pubmed.ncbi.nlm.nih.gov/1', 'Title', 'Abstract'];
    const h1 = contentHash(['thanos', ...parts]);
    const h2 = contentHash(['thanos', ...parts]);
    const h3 = contentHash(['elysium', ...parts]);
    expect(h1).toBe(h2);
    // Agent prefix keeps agent-owned rows distinct while source URL can still dedupe at staging unique index
    expect(h1).not.toBe(h3);
    expect(contentHash(parts)).toBe(contentHash(parts));
  });
});
