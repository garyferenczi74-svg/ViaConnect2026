/**
 * src/lib/kb/__tests__/snpProtocolRules.publish.test.ts
 *
 * TDD tests for publishRule (Prompt 208, Phase 3, Gate B, Task 9).
 *
 * Mocks:
 *   - @/lib/supabase/admin  (service-role client - no live DB writes)
 *   - @/lib/compliance/review-server-text  (reviewServerText)
 *   - @/lib/utils/safe-log  (safeLog - suppress console noise)
 *
 * canTransitionToPublished from knowledgeBus.ts is NOT mocked (runs real).
 *
 * No em/en-dashes. No emojis. Prompt 208 Phase 3 Task 9 (2026-06-21).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock reviewServerText BEFORE module-under-test is imported.
// ---------------------------------------------------------------------------

const mockReviewServerText = vi.fn();

vi.mock('@/lib/compliance/review-server-text', () => ({
  reviewServerText: (...args: unknown[]) => mockReviewServerText(...args),
}));

// ---------------------------------------------------------------------------
// Mock admin client with a fluent query-builder chain.
// The publish path uses:
//   supabase.from('snp_protocol_rules').select('*').eq('id', ruleId)   -> fetch
//   supabase.from('snp_protocol_rules').update({ review_status }).eq('id', ruleId) -> publish
// ---------------------------------------------------------------------------

const mockSelectFetchEq = vi.fn();
const mockSelectFetch = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// ---------------------------------------------------------------------------
// Mock safeLog to suppress noise.
// ---------------------------------------------------------------------------

const mockSafeLogWarn = vi.fn();
const mockSafeLogError = vi.fn();
const mockSafeLogInfo = vi.fn();

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: (...args: unknown[]) => mockSafeLogInfo(...args),
    warn: (...args: unknown[]) => mockSafeLogWarn(...args),
    error: (...args: unknown[]) => mockSafeLogError(...args),
  },
}));

// ---------------------------------------------------------------------------
// Import module-under-test AFTER mocks are registered.
// ---------------------------------------------------------------------------

import { publishRule } from '../snpProtocolRules';

// ---------------------------------------------------------------------------
// Helper: build a minimal SnpProtocolRule row.
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'rule-uuid-001',
    rsid: 'rs1801133',
    gene: 'MTHFR',
    genotype_match: 'TT',
    effect: 'Homozygous C677T reduces MTHFR enzyme activity 70%; folic acid cannot be converted efficiently to 5-methylTHF.',
    action_type: 'prefer_form',
    recommended_form: 'L-methylfolate',
    flagged_form: 'folic acid',
    avoid_list: ['folic-acid-fortified grains', 'high-dose folic acid supplements'],
    review_status: 'in_review',
    evidence_tier: 1,
    sensitive: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers to wire up the mock from() chain for each call pattern.
// The first from() call fetches the rule; the second (if it happens) updates.
// We use mockFrom.mockReturnValueOnce to sequence the calls.
// ---------------------------------------------------------------------------

function setupFetch(rule: Record<string, unknown> | null, fetchError: unknown = null) {
  mockSelectFetchEq.mockResolvedValueOnce({
    data: rule ? [rule] : [],
    error: fetchError,
  });
  mockSelectFetch.mockReturnValueOnce({ eq: mockSelectFetchEq });
  mockFrom.mockReturnValueOnce({ select: mockSelectFetch });
}

function setupUpdate(updateError: unknown = null) {
  mockUpdateEq.mockResolvedValueOnce({ error: updateError });
  mockUpdate.mockReturnValueOnce({ eq: mockUpdateEq });
  mockFrom.mockReturnValueOnce({ update: mockUpdate });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('publishRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: in_review + APPROVED -> publishes, returns { published:true, decision:'APPROVED' }
  it('publishes rule when in_review and reviewServerText returns APPROVED', async () => {
    const rule = makeRule({ review_status: 'in_review' });
    setupFetch(rule);
    setupUpdate();

    mockReviewServerText.mockResolvedValueOnce({
      decision: 'APPROVED',
      text: 'Some approved text',
      sanitized: false,
      stage_1_score: 0,
      stage_1_flag_count: 0,
    });

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(true);
    expect(result.decision).toBe('APPROVED');
    // The update must set review_status to 'published'
    expect(mockUpdate).toHaveBeenCalledWith({ review_status: 'published' });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'rule-uuid-001');
  });

  // Test 2: in_review + BLOCKED -> does NOT publish, returns { published:false, decision:'BLOCKED' }
  it('does not publish when reviewServerText returns BLOCKED', async () => {
    const rule = makeRule({ review_status: 'in_review' });
    setupFetch(rule);

    mockReviewServerText.mockResolvedValueOnce({
      decision: 'BLOCKED',
      text: null,
      sanitized: false,
      stage_1_score: 5,
      stage_1_flag_count: 2,
    });

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(false);
    expect(result.decision).toBe('BLOCKED');
    // Update must NOT have been called
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  // Test 3: in_review + CONDITIONAL -> publishes (with rewrite), returns { published:true, decision:'CONDITIONAL' }
  it('publishes rule when in_review and reviewServerText returns CONDITIONAL with rewrite text', async () => {
    const rule = makeRule({ review_status: 'in_review' });
    setupFetch(rule);
    setupUpdate();

    mockReviewServerText.mockResolvedValueOnce({
      decision: 'CONDITIONAL',
      text: 'safe rewrite of the rule claim',
      sanitized: true,
      stage_1_score: 2,
      stage_1_flag_count: 1,
    });

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(true);
    expect(result.decision).toBe('CONDITIONAL');
    expect(mockUpdate).toHaveBeenCalledWith({ review_status: 'published' });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'rule-uuid-001');
  });

  // Test 4: draft rule -> guard short-circuits (no reviewServerText, no update)
  it('returns published:false without calling reviewServerText when rule is in draft status', async () => {
    const rule = makeRule({ review_status: 'draft' });
    setupFetch(rule);

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(false);
    expect(result.decision).toBe('BLOCKED');
    // reviewServerText must NOT have been called
    expect(mockReviewServerText).not.toHaveBeenCalled();
    // Update must NOT have been called
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // Test 5: reviewServerText throws -> fail-safe: returns { published:false, decision:'ESCALATE' }
  it('returns published:false with decision ESCALATE when reviewServerText throws', async () => {
    const rule = makeRule({ review_status: 'in_review' });
    setupFetch(rule);

    mockReviewServerText.mockRejectedValueOnce(new Error('network timeout'));

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(false);
    expect(result.decision).toBe('ESCALATE');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSafeLogError).toHaveBeenCalled();
  });

  // Test 6: Supabase update resolves with { error } -> returns { published:false, decision:'ESCALATE' }
  it('returns published:false with decision ESCALATE when Supabase update resolves with an error', async () => {
    const rule = makeRule({ review_status: 'in_review' });
    setupFetch(rule);
    setupUpdate({ message: 'db error' });

    mockReviewServerText.mockResolvedValueOnce({
      decision: 'APPROVED',
      text: 'Some approved text',
      sanitized: false,
      stage_1_score: 0,
      stage_1_flag_count: 0,
    });

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(false);
    expect(result.decision).toBe('ESCALATE');
    expect(mockSafeLogError).toHaveBeenCalled();
  });

  // Bonus: rule not found -> returns { published:false, decision:'BLOCKED' }
  it('returns published:false with decision BLOCKED when rule is not found', async () => {
    // Fetch returns empty array (not found)
    mockSelectFetchEq.mockResolvedValueOnce({ data: [], error: null });
    mockSelectFetch.mockReturnValueOnce({ eq: mockSelectFetchEq });
    mockFrom.mockReturnValueOnce({ select: mockSelectFetch });

    const result = await publishRule('nonexistent-id');

    expect(result.published).toBe(false);
    expect(result.decision).toBe('BLOCKED');
    expect(mockReviewServerText).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // Bonus: pass_stage_1 verdict -> publishes (treated same as APPROVED)
  it('publishes rule when reviewServerText returns pass_stage_1', async () => {
    const rule = makeRule({ review_status: 'in_review' });
    setupFetch(rule);
    setupUpdate();

    mockReviewServerText.mockResolvedValueOnce({
      decision: 'pass_stage_1',
      text: 'Prefer L-methylfolate over folic acid.',
      sanitized: false,
      stage_1_score: 0,
      stage_1_flag_count: 0,
    });

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(true);
    expect(result.decision).toBe('pass_stage_1');
    expect(mockUpdate).toHaveBeenCalledWith({ review_status: 'published' });
  });

  // Bonus: ESCALATE -> does NOT publish
  it('does not publish when reviewServerText returns ESCALATE', async () => {
    const rule = makeRule({ review_status: 'in_review' });
    setupFetch(rule);

    mockReviewServerText.mockResolvedValueOnce({
      decision: 'ESCALATE',
      text: null,
      sanitized: false,
      stage_1_score: 8,
      stage_1_flag_count: 3,
    });

    const result = await publishRule('rule-uuid-001');

    expect(result.published).toBe(false);
    expect(result.decision).toBe('ESCALATE');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
