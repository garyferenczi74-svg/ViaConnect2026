/**
 * Unit tests for readSynthesis.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208, Phase 8, Task 22 (2026-06-21).
 * Task 26b: added getOrComputeUserProtocolSynthesis tests.
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the admin client (no real DB in tests).
// Mock synthesizeForUser so lazy recompute tests do not hit the DB.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/protocol/synthesis', () => ({
  synthesizeForUser: vi.fn(),
}));

// safeLog is real -- no side effects that matter in tests.

import { getLatestUserProtocolSynthesis, getOrComputeUserProtocolSynthesis, SYNTHESIS_STALE_MS, type UserProtocolSynthesisRow } from '../readSynthesis';
import { createAdminClient } from '@/lib/supabase/admin';
import { synthesizeForUser } from '@/lib/protocol/synthesis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-abc-123';

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    recommended_vitamins_minerals: [
      {
        form: 'Methylfolate',
        rationale: 'MTHFR C677T impairs folic acid conversion.',
        evidenceTier: 1,
        ruleRsid: 'rs1801133',
      },
    ],
    supplement_flags: [
      {
        current: 'Folic Acid',
        reason: 'flagged for this variant',
        alternativeForm: 'Methylfolate',
        ruleRsid: 'rs1801133',
        evidenceTier: 1,
      },
    ],
    nutrition_guidance: { avoid: ['unfortified folic acid'], prefer: ['leafy greens'] },
    disclaimers_version: 'dshea-2026-06',
    ...overrides,
  };
}

function buildSupabaseMock(resolveValue: { data: unknown; error: unknown }) {
  const limitMock = vi.fn().mockResolvedValue(resolveValue);
  const orderMock = vi.fn(() => ({ limit: limitMock }));
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { from: fromMock };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getLatestUserProtocolSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when admin client returns no rows', async () => {
    const mockClient = buildSupabaseMock({ data: [], error: null });
    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await getLatestUserProtocolSynthesis(USER_ID);
    expect(result).toBeNull();
  });

  it('returns the parsed row when data is present', async () => {
    const row = buildRow();
    const mockClient = buildSupabaseMock({ data: [row], error: null });
    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await getLatestUserProtocolSynthesis(USER_ID);
    expect(result).not.toBeNull();
    expect(result!.recommended_vitamins_minerals).toHaveLength(1);
    expect(result!.recommended_vitamins_minerals[0].form).toBe('Methylfolate');
    expect(result!.supplement_flags).toHaveLength(1);
    expect(result!.supplement_flags[0].current).toBe('Folic Acid');
    expect(result!.supplement_flags[0].alternativeForm).toBe('Methylfolate');
    expect(result!.disclaimers_version).toBe('dshea-2026-06');
  });

  it('defaults missing arrays to [] when jsonb fields are absent', async () => {
    // Row where jsonb arrays are missing (null / undefined from DB).
    const row = {
      recommended_vitamins_minerals: null,
      supplement_flags: undefined,
      nutrition_guidance: null,
      disclaimers_version: null,
    };
    const mockClient = buildSupabaseMock({ data: [row], error: null });
    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await getLatestUserProtocolSynthesis(USER_ID);
    expect(result).not.toBeNull();
    expect(result!.recommended_vitamins_minerals).toEqual([]);
    expect(result!.supplement_flags).toEqual([]);
    expect(result!.nutrition_guidance).toEqual({ avoid: [], prefer: [] });
    expect(result!.disclaimers_version).toBeNull();
  });

  it('returns null and does not throw on DB error (fail-open)', async () => {
    const mockClient = buildSupabaseMock({
      data: null,
      error: { message: 'relation does not exist', code: '42P01' },
    });
    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await getLatestUserProtocolSynthesis(USER_ID);
    expect(result).toBeNull();
  });

  it('returns null and does not throw when admin client itself throws', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    });

    const result = await getLatestUserProtocolSynthesis(USER_ID);
    expect(result).toBeNull();
  });

  it('queries by user_id ordered by generated_at desc limit 1', async () => {
    const row = buildRow();
    const limitMock = vi.fn().mockResolvedValue({ data: [row], error: null });
    const orderMock = vi.fn(() => ({ limit: limitMock }));
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as never);

    await getLatestUserProtocolSynthesis(USER_ID);

    expect(fromMock).toHaveBeenCalledWith('user_protocol_synthesis');
    expect(eqMock).toHaveBeenCalledWith('user_id', USER_ID);
    expect(orderMock).toHaveBeenCalledWith('generated_at', { ascending: false });
    expect(limitMock).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// getOrComputeUserProtocolSynthesis tests
// ---------------------------------------------------------------------------

/**
 * Build a fresh row (generated_at within SYNTHESIS_STALE_MS).
 */
function buildFreshRow(overrides: Record<string, unknown> = {}) {
  return buildRow({
    generated_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    ...overrides,
  });
}

/**
 * Build a stale row (generated_at older than SYNTHESIS_STALE_MS).
 */
function buildStaleRow(overrides: Record<string, unknown> = {}) {
  return buildRow({
    generated_at: new Date(Date.now() - SYNTHESIS_STALE_MS - 60_000).toISOString(), // past stale bound
    ...overrides,
  });
}

function buildSupabaseMockForRow(row: ReturnType<typeof buildRow> | null) {
  const data = row ? [row] : [];
  return buildSupabaseMock({ data, error: null });
}

describe('getOrComputeUserProtocolSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a fresh row without calling synthesizeForUser', async () => {
    const fresh = buildFreshRow();
    vi.mocked(createAdminClient).mockReturnValue(buildSupabaseMockForRow(fresh) as never);

    const result = await getOrComputeUserProtocolSynthesis(USER_ID);

    expect(result).not.toBeNull();
    expect(result!.disclaimers_version).toBe('dshea-2026-06');
    expect(vi.mocked(synthesizeForUser)).not.toHaveBeenCalled();
  });

  it('calls synthesizeForUser when no row exists, then returns freshly-read row', async () => {
    const freshRow = buildFreshRow();
    let callCount = 0;
    // First call returns null (no row); second call returns the fresh row.
    vi.mocked(createAdminClient).mockImplementation(() => {
      callCount += 1;
      const data = callCount === 1 ? [] : [freshRow];
      return buildSupabaseMock({ data, error: null }) as never;
    });
    vi.mocked(synthesizeForUser).mockResolvedValue({
      recommended_vitamins_minerals: [],
      supplement_flags: [],
      nutrition_guidance: { avoid: [], prefer: [] },
      arnold_context: { activeTopics: [] },
      disclaimers_version: 'dshea-2026-06',
    });

    const result = await getOrComputeUserProtocolSynthesis(USER_ID);

    expect(vi.mocked(synthesizeForUser)).toHaveBeenCalledWith(USER_ID);
    expect(result).not.toBeNull();
    expect(result!.disclaimers_version).toBe('dshea-2026-06');
  });

  it('calls synthesizeForUser when row is stale, then returns freshly-read row', async () => {
    const stale = buildStaleRow();
    const fresh = buildFreshRow();
    let callCount = 0;
    vi.mocked(createAdminClient).mockImplementation(() => {
      callCount += 1;
      const data = callCount === 1 ? [stale] : [fresh];
      return buildSupabaseMock({ data, error: null }) as never;
    });
    vi.mocked(synthesizeForUser).mockResolvedValue({
      recommended_vitamins_minerals: [],
      supplement_flags: [],
      nutrition_guidance: { avoid: [], prefer: [] },
      arnold_context: { activeTopics: [] },
      disclaimers_version: 'dshea-2026-06',
    });

    const result = await getOrComputeUserProtocolSynthesis(USER_ID);

    expect(vi.mocked(synthesizeForUser)).toHaveBeenCalledWith(USER_ID);
    expect(result).not.toBeNull();
  });

  it('does not throw and returns without crashing when synthesizeForUser throws (stale row exists)', async () => {
    const stale = buildStaleRow();
    // Use mockImplementation so every createAdminClient() call returns a fresh chain.
    vi.mocked(createAdminClient).mockImplementation(() => buildSupabaseMockForRow(stale) as never);
    vi.mocked(synthesizeForUser).mockRejectedValue(new Error('DB unavailable'));

    let threw = false;
    let result: UserProtocolSynthesisRow | null = undefined as unknown as UserProtocolSynthesisRow | null;
    try {
      result = await getOrComputeUserProtocolSynthesis(USER_ID);
    } catch {
      threw = true;
    }
    // Fail-open: must not throw
    expect(threw).toBe(false);
    // The stale row was the latest known state; it is returned unchanged.
    expect(result).not.toBeNull();
  });

  it('does not throw and returns null when no row exists and synthesizeForUser throws', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => buildSupabaseMockForRow(null) as never);
    vi.mocked(synthesizeForUser).mockRejectedValue(new Error('Network failure'));

    let threw = false;
    let result: UserProtocolSynthesisRow | null = undefined as unknown as UserProtocolSynthesisRow | null;
    try {
      result = await getOrComputeUserProtocolSynthesis(USER_ID);
    } catch {
      threw = true;
    }
    // Fail-open: must not throw
    expect(threw).toBe(false);
    // No prior row existed and recompute failed -> null (safe empty state).
    expect(result).toBeNull();
  });
});
