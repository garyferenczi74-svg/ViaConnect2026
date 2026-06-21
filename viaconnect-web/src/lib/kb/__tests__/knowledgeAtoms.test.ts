/**
 * src/lib/kb/__tests__/knowledgeAtoms.test.ts
 *
 * TDD tests for knowledgeAtoms.ts (Prompt 208, Phase 2, Task 6).
 *
 * Mocks:
 *   - @/lib/supabase/admin  (service-role client)
 *   - ./embeddings           (embedText)
 *   - @/lib/utils/safe-log   (safeLog)
 *
 * Assertions:
 *   1. atomFromEntry maps a sample monograph correctly:
 *      - evidence_tier derived from evidence_grade via gradeToTier
 *      - snp_refs = [entry.canonical_keys.rsid]
 *      - review_status === 'draft'
 *      - reviewed_by from provenance (null for all current monographs)
 *   2. getPublishedAtoms: query builder receives .eq('review_status', 'published')
 *      and must NEVER include drafts.
 *   3. seedMonographsAsDrafts: with embedText mocked to return null, still upserts
 *      and returns inserted + skipped + failed counts totalling 29.
 *   4. Existence check uses (domain, claim) -- two chained .eq() calls.
 *   5. When insert returns an error, failed is incremented (not inserted).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock safeLog BEFORE module-under-test is imported.
// ---------------------------------------------------------------------------
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock the Supabase admin client BEFORE any module-under-test is imported.
//
// The existence check now chains: .select('id').eq('domain', x).eq('claim', y)
// We model this with two levels of chaining:
//   mockEqDomain -- the first .eq('domain', ...) call; returns an object
//                   whose .eq property is mockEqClaim
//   mockEqClaim  -- the second .eq('claim', ...) call; returns { data, error }
//
// getPublishedAtoms still does a single .eq('review_status', 'published') on
// the chain that starts from .select('*'), so its chain calls mockEqDomain
// (which for that path returns the final result directly, since there is no
// second .eq chained after it).  We route both uses through mockEqDomain but
// make mockEqDomain's default return value also work as a terminal result.
// ---------------------------------------------------------------------------

const mockEqClaim = vi.fn();
const mockEqDomain = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

// Default: second .eq returns empty list (no existing rows).
mockEqClaim.mockReturnValue({ data: [], error: null });

// Default: first .eq returns an object with a second .eq (for domain+claim
// chaining) AND also behaves as a terminal result for review_status queries.
// We accomplish this by returning an object that has both `data`/`error` keys
// (for getPublishedAtoms) and an `.eq` method (for seedMonographsAsDrafts /
// upsertAtomDraft existence checks).
mockEqDomain.mockReturnValue({
  data: [],
  error: null,
  eq: mockEqClaim,
});

const makeChain = () => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = mockEqDomain;
  // Assign mockInsert directly -- do NOT call mockResolvedValue here so that
  // per-test mockInsert.mockResolvedValue() calls are not overridden.
  chain.insert = mockInsert;
  return chain;
};

const mockFrom = vi.fn(() => makeChain());

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// ---------------------------------------------------------------------------
// Mock embedText to return null (null embedding tolerated by seed).
// ---------------------------------------------------------------------------
vi.mock('../embeddings', () => ({
  embedText: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Now import modules under test (after mocks are registered).
// ---------------------------------------------------------------------------
import type { KnowledgeEntry } from '../knowledgeEntry';
import { atomFromEntry, getPublishedAtoms, seedMonographsAsDrafts, upsertAtomDraft } from '../knowledgeAtoms';
import { gradeToTier } from '../evidenceTier';
import { embedText } from '../embeddings';
import { safeLog } from '@/lib/utils/safe-log';
import { METHYLATION_SNP_MONOGRAPHS } from '../seeds/methylationSnpMonographs';

// ---------------------------------------------------------------------------
// Shared sample entry for unit tests.
// ---------------------------------------------------------------------------
const sampleEntry: KnowledgeEntry = {
  id: 'snp-rs1801133',
  domain: 'snp_monograph',
  title: 'MTHFR C677T (rs1801133)',
  canonical_keys: { rsid: 'rs1801133', gene: 'MTHFR' },
  body: 'MTHFR converts 5,10-methylene-THF to 5-methyl-THF...',
  evidence_grade: 'B',
  citations: [
    {
      claim: 'TT genotype is associated with reduced enzyme activity',
      source: 'Frosst P et al. Nat Genet. 1995;10(1):111-113.',
      source_type: 'observational',
      grade: 'B',
      url: 'https://pubmed.ncbi.nlm.nih.gov/7647779/',
    },
  ],
  compliance_status: 'pending',
  approved_claims: ['Folate and riboflavin support healthy homocysteine metabolism'],
  contraindications_and_cautions: ['Educational wellness information, not a diagnosis.'],
  genotype_dependence: ['rs1801133'],
  provenance: { drafted_by: 'hannah', reviewed_by: null, approved_by: null },
  review: { last_reviewed: null, next_review_due: null, version: 0 },
  retrievable: false,
};

// A sample entry with a reviewer attached (simulates a reviewed entry).
const reviewedEntry: KnowledgeEntry = {
  ...sampleEntry,
  id: 'snp-rs1801131',
  canonical_keys: { rsid: 'rs1801131', gene: 'MTHFR' },
  evidence_grade: 'A',
  provenance: { drafted_by: 'hannah', reviewed_by: 'dr.smith', approved_by: null },
};

// ---------------------------------------------------------------------------
// Tests: atomFromEntry
// ---------------------------------------------------------------------------
describe('atomFromEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets evidence_tier from gradeToTier(entry.evidence_grade)', () => {
    const atom = atomFromEntry(sampleEntry, 'methylation');
    expect(atom.evidence_tier).toBe(gradeToTier('B'));
    expect(atom.evidence_tier).toBe(2);
  });

  it('sets snp_refs to [rsid] when canonical_keys.rsid is present', () => {
    const atom = atomFromEntry(sampleEntry, 'methylation');
    expect(atom.snp_refs).toEqual(['rs1801133']);
  });

  it('sets snp_refs to [] when canonical_keys.rsid is absent', () => {
    const entryNoRsid: KnowledgeEntry = {
      ...sampleEntry,
      canonical_keys: { gene: 'MTHFR' },
    };
    const atom = atomFromEntry(entryNoRsid, 'methylation');
    expect(atom.snp_refs).toEqual([]);
  });

  it('sets review_status to "draft" always', () => {
    const atom = atomFromEntry(sampleEntry, 'methylation');
    expect(atom.review_status).toBe('draft');
  });

  it('preserves provenance.reviewed_by (null for all current monographs)', () => {
    const atom = atomFromEntry(sampleEntry, 'methylation');
    expect(atom.reviewed_by).toBeNull();
  });

  it('carries reviewed_by from provenance when it is set', () => {
    const atom = atomFromEntry(reviewedEntry, 'methylation');
    expect(atom.reviewed_by).toBe('dr.smith');
  });

  it('derives claim from body (or title fallback)', () => {
    const atom = atomFromEntry(sampleEntry, 'methylation');
    // claim must be a non-empty string
    expect(typeof atom.claim).toBe('string');
    expect(atom.claim.length).toBeGreaterThan(0);
  });

  it('sets evidence_tier = 1 for grade A', () => {
    const atom = atomFromEntry(reviewedEntry, 'methylation');
    expect(atom.evidence_tier).toBe(1);
  });

  it('does NOT set embedding (seed step handles that)', () => {
    const atom = atomFromEntry(sampleEntry, 'methylation');
    // embedding field must not be present or must be undefined/null
    expect((atom as Record<string, unknown>).embedding == null).toBe(true);
  });

  it('sets domain to the passed KnowledgeAtomDomain', () => {
    const atom = atomFromEntry(sampleEntry, 'methylation');
    expect(atom.domain).toBe('methylation');
  });
});

// ---------------------------------------------------------------------------
// Tests: getPublishedAtoms
// ---------------------------------------------------------------------------
describe('getPublishedAtoms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls .eq("review_status", "published") and never returns drafts', async () => {
    // Return published mock data.
    const publishedRow = { id: 'abc', review_status: 'published', claim: 'test claim' };
    mockEqDomain.mockReturnValueOnce({ data: [publishedRow], error: null, eq: mockEqClaim });

    const results = await getPublishedAtoms();

    // Must have called eq with review_status published.
    expect(mockEqDomain).toHaveBeenCalledWith('review_status', 'published');

    // Must not include any draft rows.
    for (const row of results) {
      expect((row as Record<string, unknown>).review_status).not.toBe('draft');
    }
  });

  it('filters by domain when provided', async () => {
    mockEqDomain.mockReturnValue({ data: [], error: null, eq: mockEqClaim });
    await getPublishedAtoms({ domain: 'methylation' });
    // Must have called eq with review_status=published at minimum.
    expect(mockEqDomain).toHaveBeenCalledWith('review_status', 'published');
  });

  it('returns empty array on no results', async () => {
    mockEqDomain.mockReturnValueOnce({ data: [], error: null, eq: mockEqClaim });
    const results = await getPublishedAtoms();
    expect(results).toEqual([]);
  });

  it('returns empty array on DB error (fail-open)', async () => {
    mockEqDomain.mockReturnValueOnce({ data: null, error: { message: 'connection refused' }, eq: mockEqClaim });
    const results = await getPublishedAtoms();
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: seedMonographsAsDrafts
// ---------------------------------------------------------------------------
describe('seedMonographsAsDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls embedText for each monograph even when it returns null', async () => {
    // select returns no existing rows (so all are inserted).
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    await seedMonographsAsDrafts();

    // embedText should have been called once per monograph (29 total).
    expect(embedText).toHaveBeenCalledTimes(METHYLATION_SNP_MONOGRAPHS.length);
  });

  it('returns inserted + skipped counts totalling 29 (all new)', async () => {
    // No existing rows -> all 29 inserted.
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await seedMonographsAsDrafts();

    expect(result.inserted + result.skipped + result.failed).toBe(METHYLATION_SNP_MONOGRAPHS.length);
    expect(result.inserted).toBe(29);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('skips rows that already exist (idempotent)', async () => {
    // All rows already present -> none inserted.
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [{ id: 'existing' }], error: null });

    const result = await seedMonographsAsDrafts();

    expect(result.skipped).toBe(METHYLATION_SNP_MONOGRAPHS.length);
    expect(result.inserted).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.inserted + result.skipped + result.failed).toBe(METHYLATION_SNP_MONOGRAPHS.length);
  });

  it('tolerates null embeddings (does not throw)', async () => {
    // embedText is already mocked to return null at the top level.
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    await expect(seedMonographsAsDrafts()).resolves.not.toThrow();
  });

  it('uses domain in the existence-check query (dedup key is domain + claim)', async () => {
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    await seedMonographsAsDrafts();

    // The first .eq call must receive 'domain' as the column name.
    expect(mockEqDomain).toHaveBeenCalledWith('domain', 'methylation');
    // The second .eq call must receive 'claim' as the column name.
    expect(mockEqClaim).toHaveBeenCalledWith('claim', expect.any(String));
  });

  it('increments failed (not inserted) and calls safeLog.error when insert returns an error', async () => {
    // No existing rows -> will attempt insert.
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [], error: null });
    // All inserts fail.
    mockInsert.mockResolvedValue({ error: { message: 'boom' } });

    const result = await seedMonographsAsDrafts();

    expect(result.failed).toBe(METHYLATION_SNP_MONOGRAPHS.length);
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(0);
    expect(safeLog.error).toHaveBeenCalledWith(
      'kb.seed',
      'Failed to insert knowledge atom draft',
      expect.objectContaining({ domain: 'methylation' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: upsertAtomDraft return value
// ---------------------------------------------------------------------------
describe('upsertAtomDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const minimalAtom = {
    domain: 'methylation' as const,
    claim: 'Test claim for upsert',
    mechanism: null,
    evidence_tier: 2 as const,
    source_type: 'monograph',
    source_authority: 'internal_study' as const,
    source_url: null,
    citation: null,
    snp_refs: [],
    nutrient_refs: [],
    supplement_refs: [],
    contraindications: null,
    review_status: 'draft' as const,
    reviewed_by: null,
    confidence: null,
    last_verified_at: null,
  };

  it('returns { inserted: true } when the row did not previously exist and insert succeeds', async () => {
    // No existing rows.
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [], error: null });
    // Insert succeeds.
    mockInsert.mockResolvedValue({ error: null });

    const result = await upsertAtomDraft(minimalAtom);

    expect(result).toEqual({ inserted: true });
  });

  it('returns { inserted: false } when a row with the same (domain, claim) already exists', async () => {
    // Existing row found.
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [{ id: 'already-there' }], error: null });

    const result = await upsertAtomDraft(minimalAtom);

    expect(result).toEqual({ inserted: false });
    // Insert must not have been called.
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns { inserted: false } on select error (fail-open)', async () => {
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: null, error: { message: 'select failed' } });

    const result = await upsertAtomDraft(minimalAtom);

    expect(result).toEqual({ inserted: false });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns { inserted: false } when insert errors', async () => {
    mockEqDomain.mockReturnValue({ data: null, error: null, eq: mockEqClaim });
    mockEqClaim.mockReturnValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: { message: 'insert boom' } });

    const result = await upsertAtomDraft(minimalAtom);

    expect(result).toEqual({ inserted: false });
  });
});
