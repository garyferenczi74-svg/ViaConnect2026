/**
 * src/lib/kb/__tests__/snpProtocolRules.test.ts
 *
 * TDD tests for snpProtocolRules.ts (Prompt 208, Phase 2, Task 7).
 *
 * Mocks:
 *   - @/lib/supabase/admin  (service-role client)
 *
 * Genotype helpers (normalizeGenotype / canonicalGenotype) from variantSeverity.ts
 * are NOT mocked -- they run real.
 *
 * Test groups:
 *   1. SEED_RULES -- anchor list shape and required entries
 *   2. getPublishedRules -- Gate B: published only
 *   3. ruleMatchesGenotype -- order-independent matching
 *   4. seedRulesAsDrafts -- idempotent insert; failed counter on error
 *
 * No em/en-dashes. No emojis. Prompt 208 Phase 2 Task 7 (2026-06-21).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock admin client BEFORE module-under-test is imported.
//
// Chain shape supports up to 3 chained .eq() calls:
//   mockFrom -> chain with .select, .eq (mockEqFirst), .insert
//   mockEqFirst returns { data, error, eq: mockEqSecond }
//   mockEqSecond returns { data, error, eq: mockEqThird }
//   mockEqThird returns { data, error } (terminal)
//
// seedRulesAsDrafts deduplicates on 3 keys:
//   .eq('rsid', ...).eq('genotype_match', ...).eq('action_type', ...)
// getPublishedRules uses a single .eq('review_status', 'published') which
// terminates at mockEqFirst.
// ---------------------------------------------------------------------------

const mockEqThird = vi.fn();
const mockEqSecond = vi.fn();
const mockEqFirst = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

// Default third eq: terminal result -- no existing rows.
mockEqThird.mockReturnValue({ data: [], error: null });

// Default second eq: exposes third eq for chaining.
mockEqSecond.mockReturnValue({
  data: [],
  error: null,
  eq: mockEqThird,
});

// Default first eq: exposes second eq for chaining. Also works as a terminal
// result for single-eq callers (getPublishedRules) because data/error are set.
mockEqFirst.mockReturnValue({
  data: [],
  error: null,
  eq: mockEqSecond,
});

const makeChain = () => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = mockEqFirst;
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
// Import module under test AFTER mocks are registered.
// ---------------------------------------------------------------------------
import {
  SEED_RULES,
  getPublishedRules,
  ruleMatchesGenotype,
  seedRulesAsDrafts,
} from '../snpProtocolRules';

// ---------------------------------------------------------------------------
// 1. SEED_RULES -- anchor list completeness
// ---------------------------------------------------------------------------
describe('SEED_RULES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SEED_RULES)).toBe(true);
    expect(SEED_RULES.length).toBeGreaterThan(0);
  });

  it('contains NO published entries (all must be draft or in_review)', () => {
    for (const rule of SEED_RULES) {
      expect(['draft', 'in_review']).toContain(rule.review_status);
    }
  });

  // MTHFR rs1801133 anchors
  it('has MTHFR rs1801133 with prefer_form + L-methylfolate + folic-acid avoid_list', () => {
    const rules = SEED_RULES.filter(
      (r) => r.rsid === 'rs1801133' && r.gene === 'MTHFR',
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('prefer_form');
      expect(r.recommended_form).toBe('L-methylfolate');
      expect(r.flagged_form).toBe('folic acid');
      expect(Array.isArray(r.avoid_list)).toBe(true);
      expect(r.avoid_list).toContain('folic-acid-fortified grains');
    }
  });

  // MTHFR rs1801131 anchors
  it('has MTHFR rs1801131 with prefer_form + L-methylfolate + folic-acid avoid_list', () => {
    const rules = SEED_RULES.filter(
      (r) => r.rsid === 'rs1801131' && r.gene === 'MTHFR',
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('prefer_form');
      expect(r.recommended_form).toBe('L-methylfolate');
      expect(r.flagged_form).toBe('folic acid');
      expect(Array.isArray(r.avoid_list)).toBe(true);
      expect(r.avoid_list).toContain('folic-acid-fortified grains');
    }
  });

  // MTR rs1805087
  it('has MTR rs1805087 with dose_context and methylcobalamin reference', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs1805087');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('dose_context');
      expect(r.recommended_form).toMatch(/methylcobalamin/i);
    }
  });

  // MTRR rs1801394
  it('has MTRR rs1801394 with dose_context', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs1801394');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('dose_context');
    }
  });

  // COMT rs4680
  it('has COMT rs4680 with dose_context', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs4680');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('dose_context');
    }
  });

  // VDR rs2228570
  it('has VDR rs2228570 with monitor_biomarker', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs2228570');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('monitor_biomarker');
    }
  });

  // VDR rs1544410
  it('has VDR rs1544410 with monitor_biomarker', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs1544410');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('monitor_biomarker');
    }
  });

  // FUT2 rs601338
  it('has FUT2 rs601338 with dose_context', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs601338');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('dose_context');
    }
  });

  // BCO1 rs12934922
  it('has BCO1 rs12934922 with dose_context', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs12934922');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('dose_context');
    }
  });

  // BCO1 rs7501331
  it('has BCO1 rs7501331 with dose_context', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs7501331');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('dose_context');
    }
  });

  // HFE rs1800562 -- canonical safety interlock
  it('has HFE rs1800562 with contraindicate + flagged_form iron + sensitive false', () => {
    const rules = SEED_RULES.filter(
      (r) => r.rsid === 'rs1800562' && r.gene === 'HFE',
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('contraindicate');
      expect(r.flagged_form).toBe('iron');
      expect(r.sensitive).toBe(false);
    }
  });

  // HFE rs1799945 -- canonical safety interlock
  it('has HFE rs1799945 with contraindicate + flagged_form iron + sensitive false', () => {
    const rules = SEED_RULES.filter(
      (r) => r.rsid === 'rs1799945' && r.gene === 'HFE',
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('contraindicate');
      expect(r.flagged_form).toBe('iron');
      expect(r.sensitive).toBe(false);
    }
  });

  // APOE rs429358 -- consent-gated
  it('has APOE rs429358 with practitioner_only + sensitive true', () => {
    const rules = SEED_RULES.filter(
      (r) => r.rsid === 'rs429358' && r.gene === 'APOE',
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('practitioner_only');
      expect(r.sensitive).toBe(true);
    }
  });

  // APOE rs7412 -- consent-gated
  it('has APOE rs7412 with practitioner_only + sensitive true', () => {
    const rules = SEED_RULES.filter(
      (r) => r.rsid === 'rs7412' && r.gene === 'APOE',
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('practitioner_only');
      expect(r.sensitive).toBe(true);
    }
  });

  // TCN2 rs1801198
  it('has TCN2 rs1801198 with monitor_biomarker', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs1801198');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('monitor_biomarker');
    }
  });

  // LCT rs4988235 (AMY1/LCT)
  it('has LCT rs4988235 with dose_context', () => {
    const rules = SEED_RULES.filter((r) => r.rsid === 'rs4988235');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('dose_context');
    }
  });

  // HLA-DQ2/DQ8 practitioner_only
  it('has HLA-DQ2/DQ8 entry with practitioner_only', () => {
    const rules = SEED_RULES.filter((r) => r.gene === 'HLA-DQ2/DQ8');
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.action_type).toBe('practitioner_only');
    }
  });

  // All entries have required fields
  it('every entry has rsid, gene, genotype_match, action_type, and review_status', () => {
    for (const r of SEED_RULES) {
      expect(typeof r.rsid).toBe('string');
      expect(r.rsid.length).toBeGreaterThan(0);
      expect(typeof r.gene).toBe('string');
      expect(r.gene.length).toBeGreaterThan(0);
      expect(typeof r.genotype_match).toBe('string');
      expect(typeof r.action_type).toBe('string');
      expect(typeof r.review_status).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. getPublishedRules -- Gate B: always filters on review_status = published
// ---------------------------------------------------------------------------
describe('getPublishedRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset defaults after clearAllMocks
    mockEqThird.mockReturnValue({ data: [], error: null });
    mockEqSecond.mockReturnValue({ data: [], error: null, eq: mockEqThird });
    mockEqFirst.mockReturnValue({ data: [], error: null, eq: mockEqSecond });
  });

  it('calls .eq("review_status", "published")', async () => {
    mockEqFirst.mockReturnValueOnce({
      data: [{ id: 'x', review_status: 'published', rsid: 'rs1801133', genotype_match: 'TT' }],
      error: null,
      eq: mockEqSecond,
    });

    await getPublishedRules();
    expect(mockEqFirst).toHaveBeenCalledWith('review_status', 'published');
  });

  it('never returns non-published rows (filter enforced)', async () => {
    // Simulate DB returning a mix -- the function must filter to published only
    const rows = [
      { id: '1', review_status: 'published', rsid: 'rs1801133', genotype_match: 'TT' },
      { id: '2', review_status: 'draft', rsid: 'rs1801131', genotype_match: 'CT' },
    ];
    mockEqFirst.mockReturnValueOnce({ data: rows, error: null, eq: mockEqSecond });

    const result = await getPublishedRules();
    for (const r of result) {
      expect(r.review_status).toBe('published');
    }
  });

  it('returns empty array when DB returns empty data', async () => {
    mockEqFirst.mockReturnValueOnce({ data: [], error: null, eq: mockEqSecond });
    const result = await getPublishedRules();
    expect(result).toEqual([]);
  });

  it('returns empty array on DB error (fail-open)', async () => {
    mockEqFirst.mockReturnValueOnce({ data: null, error: { message: 'down' }, eq: mockEqSecond });
    const result = await getPublishedRules();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. ruleMatchesGenotype -- order-independent via canonicalGenotype
// ---------------------------------------------------------------------------
describe('ruleMatchesGenotype', () => {
  it('matches when rule genotype_match equals member genotype (same order)', () => {
    expect(ruleMatchesGenotype({ genotype_match: 'TT' }, 'TT')).toBe(true);
  });

  it('matches CT rule against TC member genotype (order-independent)', () => {
    expect(ruleMatchesGenotype({ genotype_match: 'CT' }, 'TC')).toBe(true);
  });

  it('matches TC rule against CT member genotype (order-independent)', () => {
    expect(ruleMatchesGenotype({ genotype_match: 'TC' }, 'CT')).toBe(true);
  });

  it('returns false when genotypes differ', () => {
    expect(ruleMatchesGenotype({ genotype_match: 'TT' }, 'CT')).toBe(false);
  });

  it('returns false when genotype is completely different', () => {
    expect(ruleMatchesGenotype({ genotype_match: 'AA' }, 'GG')).toBe(false);
  });

  it('wildcard empty string genotype_match matches any genotype', () => {
    expect(ruleMatchesGenotype({ genotype_match: '' }, 'CT')).toBe(true);
    expect(ruleMatchesGenotype({ genotype_match: '' }, 'TT')).toBe(true);
    expect(ruleMatchesGenotype({ genotype_match: '' }, 'AA')).toBe(true);
  });

  it('wildcard * genotype_match matches any genotype', () => {
    expect(ruleMatchesGenotype({ genotype_match: '*' }, 'TT')).toBe(true);
    expect(ruleMatchesGenotype({ genotype_match: '*' }, 'CT')).toBe(true);
  });

  it('normalizes separators: "C/T" rule matches "CT" member', () => {
    expect(ruleMatchesGenotype({ genotype_match: 'C/T' }, 'CT')).toBe(true);
  });

  it('normalizes separators: "C T" rule matches "TC" member', () => {
    expect(ruleMatchesGenotype({ genotype_match: 'C T' }, 'TC')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. seedRulesAsDrafts -- idempotent insert; failed counter on insert error
// ---------------------------------------------------------------------------
describe('seedRulesAsDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset defaults after clearAllMocks -- 3-level chain for 3 dedup .eq() calls.
    mockEqThird.mockReturnValue({ data: [], error: null });
    mockEqSecond.mockReturnValue({ data: [], error: null, eq: mockEqThird });
    mockEqFirst.mockReturnValue({ data: [], error: null, eq: mockEqSecond });
  });

  it('returns inserted + skipped + failed totalling SEED_RULES.length (all new)', async () => {
    // mockEqThird is the terminal level: no existing rows -> all inserted.
    mockEqThird.mockReturnValue({ data: [], error: null });
    mockEqSecond.mockReturnValue({ data: null, error: null, eq: mockEqThird });
    mockEqFirst.mockReturnValue({ data: null, error: null, eq: mockEqSecond });
    mockInsert.mockResolvedValue({ error: null });

    const result = await seedRulesAsDrafts();

    expect(result.inserted + result.skipped + result.failed).toBe(SEED_RULES.length);
    expect(result.inserted).toBe(SEED_RULES.length);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('skips rows that already exist (idempotent)', async () => {
    // mockEqThird returns existing row -> all skipped.
    mockEqThird.mockReturnValue({ data: [{ id: 'existing' }], error: null });
    mockEqSecond.mockReturnValue({ data: null, error: null, eq: mockEqThird });
    mockEqFirst.mockReturnValue({ data: null, error: null, eq: mockEqSecond });

    const result = await seedRulesAsDrafts();

    expect(result.skipped).toBe(SEED_RULES.length);
    expect(result.inserted).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('increments failed (not inserted) when insert returns an error', async () => {
    // No existing rows -> attempts insert, which fails.
    mockEqThird.mockReturnValue({ data: [], error: null });
    mockEqSecond.mockReturnValue({ data: null, error: null, eq: mockEqThird });
    mockEqFirst.mockReturnValue({ data: null, error: null, eq: mockEqSecond });
    mockInsert.mockResolvedValue({ error: { message: 'constraint violation' } });

    const result = await seedRulesAsDrafts();

    expect(result.failed).toBe(SEED_RULES.length);
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('deduplication key uses rsid + genotype_match + action_type', async () => {
    mockEqThird.mockReturnValue({ data: [], error: null });
    mockEqSecond.mockReturnValue({ data: null, error: null, eq: mockEqThird });
    mockEqFirst.mockReturnValue({ data: null, error: null, eq: mockEqSecond });
    mockInsert.mockResolvedValue({ error: null });

    await seedRulesAsDrafts();

    // First .eq call must use rsid as the column name.
    expect(mockEqFirst).toHaveBeenCalledWith('rsid', expect.any(String));
    // Second .eq call must use genotype_match.
    expect(mockEqSecond).toHaveBeenCalledWith('genotype_match', expect.any(String));
    // Third .eq call must use action_type.
    expect(mockEqThird).toHaveBeenCalledWith('action_type', expect.any(String));
  });
});
