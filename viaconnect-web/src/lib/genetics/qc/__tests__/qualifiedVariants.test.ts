/**
 * Unit tests for qualifiedVariants.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208a Task A3 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { getQualifiedUserVariants } from '../qualifiedVariants';
import { createAdminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A variant row matching QualifiedVariantRow. */
function variantRow(rsid: string, genotype = 'TT') {
  return {
    rsid,
    gene: 'MTHFR',
    genotype,
    panel_key: 'methylation',
    status: 'confirmed',
  };
}

/**
 * A variant_calls row.
 * orientation_resolved = true, is_no_call = false -> PASS (include)
 * orientation_resolved = false -> EXCLUDE
 * is_no_call = true -> EXCLUDE
 */
function callRow(
  rsid: string,
  orientation_resolved: boolean,
  is_no_call: boolean,
  created_at = '2026-01-01T00:00:00Z',
) {
  return { rsid, orientation_resolved, is_no_call, created_at };
}

/**
 * Build a Supabase admin mock that returns different data per table.
 * All select chains eventually resolve to { data, error }.
 */
function buildAdminMock(
  variantData: unknown[],
  variantError: object | null,
  callData: unknown[],
  callError: object | null,
) {
  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_variants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockResolvedValue({ data: variantData, error: variantError }),
        };
      }
      if (table === 'variant_calls') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: callData, error: callError }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        neq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Variant with orientation_resolved:true, is_no_call:false -> INCLUDED
// ---------------------------------------------------------------------------

describe('getQualifiedUserVariants', () => {
  it('includes a variant whose latest call is resolved and not a no-call', async () => {
    const userId = 'user-1';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133')],
        null,
        [callRow('rs1801133', true, false)],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(1);
    expect(result[0].rsid).toBe('rs1801133');
  });

  // -------------------------------------------------------------------------
  // 2. Variant with orientation_resolved:false -> EXCLUDED
  // -------------------------------------------------------------------------

  it('excludes a variant whose latest call has orientation_resolved false', async () => {
    const userId = 'user-2';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133')],
        null,
        [callRow('rs1801133', false, false)],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 3. Variant with is_no_call:true -> EXCLUDED
  // -------------------------------------------------------------------------

  it('excludes a variant whose latest call is a no-call', async () => {
    const userId = 'user-3';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133')],
        null,
        [callRow('rs1801133', true, true)],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 4. Variant with NO call row (legacy) -> INCLUDED (backward compatible)
  // -------------------------------------------------------------------------

  it('includes a legacy variant with no variant_calls row', async () => {
    const userId = 'user-4';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133')],
        null,
        [], // no call rows
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(1);
    expect(result[0].rsid).toBe('rs1801133');
  });

  // -------------------------------------------------------------------------
  // 5. Multiple call rows for same rsid: LATEST (by created_at) decides
  // -------------------------------------------------------------------------

  it('uses the latest call by created_at when multiple rows exist for the same rsid', async () => {
    const userId = 'user-5';
    // Older row says resolved; newer row says unresolved -> should EXCLUDE
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133')],
        null,
        [
          callRow('rs1801133', true, false, '2026-01-01T00:00:00Z'),  // older, resolved
          callRow('rs1801133', false, false, '2026-06-15T00:00:00Z'), // newer, unresolved
        ],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(0);
  });

  it('uses the latest call when older row is unresolved and newer row is resolved', async () => {
    const userId = 'user-5b';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133')],
        null,
        [
          callRow('rs1801133', false, false, '2026-01-01T00:00:00Z'), // older, unresolved
          callRow('rs1801133', true, false, '2026-06-15T00:00:00Z'),  // newer, resolved
        ],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(1);
    expect(result[0].rsid).toBe('rs1801133');
  });

  // -------------------------------------------------------------------------
  // 6. variant_calls query error -> fail-open: return base variants unfiltered
  // -------------------------------------------------------------------------

  it('returns base variants unfiltered when variant_calls query throws an error (fail-open)', async () => {
    const userId = 'user-6';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133'), variantRow('rs1800562', 'AA')],
        null,
        [],
        { message: 'DB error', code: '500' }, // variant_calls query error
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    // Should return all 2 base variants, not filter any out
    expect(result).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // 7. user_variants query error -> return []
  // -------------------------------------------------------------------------

  it('returns empty array when user_variants query errors', async () => {
    const userId = 'user-7';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [],
        { message: 'DB error', code: '500' },
        [],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 8. Mixed: some included, some excluded
  // -------------------------------------------------------------------------

  it('includes resolved variants and excludes unresolved ones from a mixed set', async () => {
    const userId = 'user-8';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [variantRow('rs1801133'), variantRow('rs1800562', 'AA'), variantRow('rs4680', 'AG')],
        null,
        [
          callRow('rs1801133', true, false),  // included
          callRow('rs1800562', false, false), // excluded (orientation unresolved)
          callRow('rs4680', true, true),      // excluded (no-call)
        ],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(1);
    expect(result[0].rsid).toBe('rs1801133');
  });

  // -------------------------------------------------------------------------
  // 9. Output shape matches QualifiedVariantRow
  // -------------------------------------------------------------------------

  it('returns rows matching the QualifiedVariantRow shape', async () => {
    const userId = 'user-9';
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      buildAdminMock(
        [{ rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: 'confirmed' }],
        null,
        [callRow('rs1801133', true, false)],
        null,
      ),
    );

    const result = await getQualifiedUserVariants(userId);
    expect(result).toHaveLength(1);
    const row = result[0];
    expect(row).toHaveProperty('rsid', 'rs1801133');
    expect(row).toHaveProperty('gene', 'MTHFR');
    expect(row).toHaveProperty('genotype', 'TT');
    expect(row).toHaveProperty('panel_key', 'methylation');
    expect(row).toHaveProperty('status', 'confirmed');
  });
});
