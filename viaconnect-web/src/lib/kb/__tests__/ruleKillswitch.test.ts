/**
 * src/lib/kb/__tests__/ruleKillswitch.test.ts
 *
 * TDD tests for ruleKillswitch.ts (Prompt 208a Module I Task I3).
 *
 * Tests:
 *   1. getKilledRuleIds: maps disabled=true rows to a Set of rule_ids.
 *   2. getKilledRuleIds: DB error -> returns empty Set (fail-open, no throw).
 *   3. getActivePublishedRules: excludes a rule whose id is in the killed set.
 *   4. getActivePublishedRules: keeps non-killed rules.
 *   5. getActivePublishedRules: when killed set is empty, returns all published rules.
 *
 * Mocks: @/lib/supabase/admin (admin client), @/lib/kb/snpProtocolRules
 * (getPublishedRules). No live DB calls.
 *
 * No em/en-dashes. No emojis. Prompt 208a I3 (2026-06-22).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock admin client before module import.
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock getPublishedRules from snpProtocolRules so we control the published set.
vi.mock('@/lib/kb/snpProtocolRules', () => ({
  getPublishedRules: vi.fn(),
  ruleMatchesGenotype: vi.fn(),
}));

import { getKilledRuleIds, getActivePublishedRules } from '../ruleKillswitch';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublishedRules } from '@/lib/kb/snpProtocolRules';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal SnpProtocolRule-shaped object for testing. */
function makeRule(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    rsid: 'rs1801133',
    gene: 'MTHFR',
    genotype_match: 'TT',
    action_type: 'prefer_form',
    recommended_form: 'L-methylfolate',
    review_status: 'published',
    sensitive: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a mock admin client that returns `rows` from rule_killswitch. */
function makeAdminWithKillswitch(rows: unknown[], error: object | null = null) {
  const resolvedValue = { data: rows, error };
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(resolvedValue),
  };
  const from = vi.fn().mockReturnValue(chain);
  return { from };
}

// ---------------------------------------------------------------------------
// beforeEach: clear mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Group 1: getKilledRuleIds
// ---------------------------------------------------------------------------

describe('getKilledRuleIds', () => {
  it('returns a Set of rule_id strings from disabled=true rows', async () => {
    const rows = [
      { rule_id: 'rule-aaa', disabled: true },
      { rule_id: 'rule-bbb', disabled: true },
    ];
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch(rows),
    );

    const result = await getKilledRuleIds();

    expect(result).toBeInstanceOf(Set);
    expect(result.has('rule-aaa')).toBe(true);
    expect(result.has('rule-bbb')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('returns an empty Set when no rows are disabled', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([]),
    );

    const result = await getKilledRuleIds();

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('returns an empty Set on DB error (fail-open, no throw)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([], { message: 'DB error', code: '42P01' }),
    );

    // Must not throw; must return an empty Set.
    const result = await getKilledRuleIds();

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('returns an empty Set when admin client throws (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(new Error('network failure')),
      }),
    });

    // Must not throw; must return an empty Set.
    const result = await getKilledRuleIds();

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('returns null data as empty Set (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const result = await getKilledRuleIds();

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 2: getActivePublishedRules
// ---------------------------------------------------------------------------

describe('getActivePublishedRules', () => {
  it('excludes a rule whose id is in the killed set', async () => {
    const ruleA = makeRule('rule-aaa');
    const ruleB = makeRule('rule-bbb');

    // getPublishedRules returns both; killswitch kills ruleA
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([ruleA, ruleB]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([{ rule_id: 'rule-aaa', disabled: true }]),
    );

    const result = await getActivePublishedRules();

    expect(result.find((r) => r.id === 'rule-aaa')).toBeUndefined();
    expect(result.find((r) => r.id === 'rule-bbb')).toBeDefined();
  });

  it('keeps all rules when killed set is empty', async () => {
    const ruleA = makeRule('rule-aaa');
    const ruleB = makeRule('rule-bbb');

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([ruleA, ruleB]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([]),
    );

    const result = await getActivePublishedRules();

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.id === 'rule-aaa')).toBeDefined();
    expect(result.find((r) => r.id === 'rule-bbb')).toBeDefined();
  });

  it('returns all published rules when killswitch read fails (fail-open)', async () => {
    const ruleA = makeRule('rule-aaa');
    const ruleB = makeRule('rule-bbb');

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([ruleA, ruleB]);
    // DB error on killswitch read -> empty killed set -> all rules pass through
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([], { message: 'DB error', code: '42P01' }),
    );

    const result = await getActivePublishedRules();

    // Fail-open: all rules still flow when killswitch read fails
    expect(result).toHaveLength(2);
  });

  it('excludes multiple killed rules and returns only live rules', async () => {
    const ruleA = makeRule('rule-aaa');
    const ruleB = makeRule('rule-bbb');
    const ruleC = makeRule('rule-ccc');

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([ruleA, ruleB, ruleC]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([
        { rule_id: 'rule-aaa', disabled: true },
        { rule_id: 'rule-ccc', disabled: true },
      ]),
    );

    const result = await getActivePublishedRules();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rule-bbb');
  });

  it('returns empty array when all rules are killed', async () => {
    const ruleA = makeRule('rule-aaa');

    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([ruleA]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([{ rule_id: 'rule-aaa', disabled: true }]),
    );

    const result = await getActivePublishedRules();

    expect(result).toHaveLength(0);
  });

  it('returns empty array when getPublishedRules returns empty', async () => {
    (getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminWithKillswitch([]),
    );

    const result = await getActivePublishedRules();

    expect(result).toHaveLength(0);
  });
});
