/**
 * Unit tests for persistConcordance.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208a Task E4b (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock modules that hit the DB or external APIs.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/genetics/qc/qualifiedVariants', () => ({
  getQualifiedUserVariants: vi.fn(),
}));

vi.mock('@/lib/labs/loadLabResults', () => ({
  loadLabResults: vi.fn(),
}));

import { computeAndPersistConcordance } from '../persistConcordance';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { loadLabResults } from '@/lib/labs/loadLabResults';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInsertMock(resolvedValue: { data: null; error: null | object } = { data: null, error: null }) {
  return {
    from: vi.fn().mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue(resolvedValue),
    })),
  };
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test 1: MTHFR +/+ variant + elevated homocysteine -> concordant, persisted, returned
// ---------------------------------------------------------------------------

describe('computeAndPersistConcordance', () => {
  it('returns a concordant record for MTHFR +/+ with elevated homocysteine, and persists it', async () => {
    const userId = 'user-mthfr-concordant';

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: '+/+' },
    ]);

    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        name: 'homocysteine',
        value: 15,
        unit: 'umol/L',
        panelGroup: 'cardiovascular',
        standard: { low: 5, high: 12 },
        geneticOptimal: { low: 5, high: 10 },
        gene: 'MTHFR',
        status: 'consult',
        tier: 'consult',
        direction: 'high',
        confidence: null,
        collectionDate: null,
        trend: null,
      },
    ]);

    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    });

    const records = await computeAndPersistConcordance(userId);

    expect(records).toHaveLength(1);
    expect(records[0].gene).toBe('MTHFR');
    expect(records[0].biomarker).toBe('homocysteine');
    expect(records[0].state).toBe('concordant');
    expect(records[0].confidence).toBe('high');

    // Persisted
    expect(insertMock).toHaveBeenCalledOnce();
    const inserted = insertMock.mock.calls[0][0];
    expect(Array.isArray(inserted)).toBe(true);
    expect(inserted[0]).toMatchObject({
      user_id: userId,
      gene: 'MTHFR',
      biomarker: 'homocysteine',
      concordance_state: 'concordant',
      confidence: 'high',
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: No labs -> []
  // -------------------------------------------------------------------------

  it('returns [] when there are no labs', async () => {
    const userId = 'user-no-labs';

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: '+/+' },
    ]);

    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    });

    const records = await computeAndPersistConcordance(userId);

    expect(records).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Test 3: getQualifiedUserVariants throws -> [] (fail-open, no throw)
  // -------------------------------------------------------------------------

  it('returns [] without throwing when getQualifiedUserVariants throws', async () => {
    const userId = 'user-variants-throws';

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('DB connection failed'),
    );

    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    });

    const records = await computeAndPersistConcordance(userId);

    expect(records).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Test 4: loadLabResults throws -> [] (fail-open, no throw)
  // -------------------------------------------------------------------------

  it('returns [] without throwing when loadLabResults throws', async () => {
    const userId = 'user-labs-throws';

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: '+/+' },
    ]);

    (loadLabResults as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Lab query failed'),
    );

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    });

    const records = await computeAndPersistConcordance(userId);

    expect(records).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Test 5: persist insert error -> still returns the records (fail-open persist)
  // -------------------------------------------------------------------------

  it('still returns records even when insert fails', async () => {
    const userId = 'user-insert-fails';

    (getQualifiedUserVariants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rsid: 'rs1801133', gene: 'MTHFR', genotype: 'TT', panel_key: 'methylation', status: '+/+' },
    ]);

    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        name: 'homocysteine',
        value: 20,
        unit: 'umol/L',
        panelGroup: 'cardiovascular',
        standard: { low: 5, high: 12 },
        geneticOptimal: { low: 5, high: 10 },
        gene: 'MTHFR',
        status: 'consult',
        tier: 'consult',
        direction: 'high',
        confidence: null,
        collectionDate: null,
        trend: null,
      },
    ]);

    // Simulate an insert error
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
      }),
    });

    const records = await computeAndPersistConcordance(userId);

    // Records are still returned despite the insert error
    expect(records).toHaveLength(1);
    expect(records[0].state).toBe('concordant');
  });
});
