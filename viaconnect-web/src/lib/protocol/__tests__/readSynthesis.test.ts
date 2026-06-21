/**
 * Unit tests for readSynthesis.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208, Phase 8, Task 22 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the admin client (no real DB in tests).
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// safeLog is real -- no side effects that matter in tests.

import { getLatestUserProtocolSynthesis } from '../readSynthesis';
import { createAdminClient } from '@/lib/supabase/admin';

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
